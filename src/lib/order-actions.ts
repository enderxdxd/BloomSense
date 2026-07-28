import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Shared cancellation/refund mechanics used by the customer cancel route,
 * the admin pipeline and the Stripe webhook. Stock restocking is keyed on
 * the status transition: only CONFIRMED-and-later orders ever decremented
 * stock (the webhook does it on payment success), so only those restock.
 */

export const CUSTOMER_CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"];
const STOCK_WAS_DECREMENTED = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];

export class RefundUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundUnavailableError";
  }
}

/** Issues a full Stripe refund for the order's PaymentIntent. */
export async function createStripeRefund(order: {
  id: string;
  stripePaymentId: string | null;
}): Promise<string> {
  if (!isStripeConfigured()) {
    throw new RefundUnavailableError(
      "Refunds are unavailable until Stripe is configured on this server.",
    );
  }
  if (!order.stripePaymentId) {
    throw new RefundUnavailableError(
      "This order has no payment attached to refund.",
    );
  }
  const refund = await getStripe().refunds.create({
    payment_intent: order.stripePaymentId,
    metadata: { orderId: order.id },
  });
  return refund.id;
}

/**
 * Marks an order CANCELLED/REFUNDED and restores stock when the order had
 * previously decremented it. Idempotent: an order already in a terminal
 * state is returned unchanged.
 */
export async function finalizeCancellation(options: {
  orderId: string;
  toStatus: "CANCELLED" | "REFUNDED";
  stripeRefundId?: string | null;
}) {
  const { orderId, toStatus, stripeRefundId } = options;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return order;
    }

    const shouldRestock = STOCK_WAS_DECREMENTED.includes(order.status);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        cancelledAt: new Date(),
        ...(stripeRefundId ? { stripeRefundId } : {}),
      },
      include: { items: true },
    });

    if (shouldRestock) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return updated;
  });
}

/** Best-effort cancellation of an unpaid PENDING order's PaymentIntent. */
export async function cancelPaymentIntentIfPossible(order: {
  stripePaymentId: string | null;
}): Promise<void> {
  if (!isStripeConfigured() || !order.stripePaymentId) return;
  try {
    await getStripe().paymentIntents.cancel(order.stripePaymentId);
  } catch (err) {
    // Already-succeeded or already-cancelled intents throw — the order-level
    // state machine is the source of truth, so log and move on.
    console.warn("[orders] PaymentIntent cancel skipped:", err);
  }
}
