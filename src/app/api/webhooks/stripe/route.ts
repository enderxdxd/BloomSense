import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { finalizeCancellation } from "@/lib/order-actions";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook. Every request MUST carry a valid stripe-signature —
 * anything unsigned or mis-signed is rejected before any processing.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !webhookSecret) {
    // Name the gap in the server log only. The response body goes to an
    // unauthenticated caller, so it must not describe our configuration —
    // but "not configured" alone gives the operator nothing to act on.
    const missing = [
      !isStripeConfigured() ? "STRIPE_SECRET_KEY" : null,
      !webhookSecret ? "STRIPE_WEBHOOK_SECRET" : null,
    ].filter((name): name is string => name !== null);
    console.error(
      `[webhooks/stripe] Not configured — missing ${missing.join(" and ")} ` +
        `in this environment. Set it, then redeploy: environment variables ` +
        `are read at boot, so an existing deployment keeps the old values.`,
    );
    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("[webhooks/stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        await handlePaymentFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        break; // Unhandled event types are acknowledged without action.
    }
  } catch (err) {
    console.error(`[webhooks/stripe] Failed handling ${event.type}:`, err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId;
  if (!orderId) {
    console.warn("[webhooks/stripe] succeeded intent without orderId metadata");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      console.warn(`[webhooks/stripe] Order ${orderId} not found`);
      return;
    }
    // Idempotency: only a PENDING order transitions + decrements stock.
    if (order.status !== "PENDING") return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED", stripePaymentId: intent.id },
    });

    for (const item of order.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        // Payment already captured; log the oversell loudly instead of
        // failing the confirmation.
        console.error(
          `[webhooks/stripe] OVERSOLD product ${item.productId} on order ${orderId}`,
        );
      }
    }
  });
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

/**
 * Refunds issued OUTSIDE the app (Stripe dashboard, support tooling) still
 * land here: flip the order to REFUNDED and restock. Refunds our own
 * endpoints issued already finalized the order, so finalizeCancellation's
 * terminal-state check makes this a no-op for them.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  const orderId = charge.metadata?.orderId
    ? charge.metadata.orderId
    : paymentIntentId
      ? (
          await prisma.order.findFirst({
            where: { stripePaymentId: paymentIntentId },
            select: { id: true },
          })
        )?.id
      : undefined;

  if (!orderId) {
    console.warn("[webhooks/stripe] refunded charge with no matching order");
    return;
  }

  await finalizeCancellation({
    orderId,
    toStatus: "REFUNDED",
    stripeRefundId: charge.refunds?.data?.[0]?.id ?? null,
  });
}
