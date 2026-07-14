import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
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
