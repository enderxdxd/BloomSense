import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  cancelPaymentIntentIfPossible,
  createStripeRefund,
  CUSTOMER_CANCELLABLE,
  finalizeCancellation,
  RefundUnavailableError,
} from "@/lib/order-actions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

/**
 * Customer-initiated cancellation. Owner-only.
 * - PENDING (unpaid): cancels outright — no refund needed.
 * - CONFIRMED / PREPARING (paid): issues a full Stripe refund and restocks.
 * - SHIPPED and later: not self-service — the shop handles those cases.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: auth.status },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, stripePaymentId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
    return NextResponse.json(
      {
        error:
          order.status === "CANCELLED" || order.status === "REFUNDED"
            ? "This order is already cancelled."
            : "This order has already shipped — contact us and we'll sort it out.",
      },
      { status: 422 },
    );
  }

  try {
    if (order.status === "PENDING") {
      await cancelPaymentIntentIfPossible(order);
      const updated = await finalizeCancellation({
        orderId: order.id,
        toStatus: "CANCELLED",
      });
      return NextResponse.json({
        order: { id: order.id, status: updated?.status ?? "CANCELLED" },
        refunded: false,
      });
    }

    // Paid order: refund first, then flip state + restock.
    const refundId = await createStripeRefund(order);
    const updated = await finalizeCancellation({
      orderId: order.id,
      toStatus: "REFUNDED",
      stripeRefundId: refundId,
    });
    return NextResponse.json({
      order: { id: order.id, status: updated?.status ?? "REFUNDED" },
      refunded: true,
      refundId,
    });
  } catch (err) {
    if (err instanceof RefundUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[orders/cancel] Failed:", err);
    return NextResponse.json(
      { error: "Cancellation failed — nothing was changed. Try again." },
      { status: 502 },
    );
  }
}
