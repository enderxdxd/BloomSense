import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderCreateSchema } from "@/lib/schema";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Creates a PENDING order from cart items and returns a Stripe
 * PaymentIntent client secret. Prices and stock are ALWAYS re-read from
 * the database — client-provided prices are never trusted.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: auth.status },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this server yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = OrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Merge duplicate lines for the same product.
  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  const productIds = [...quantities.keys()];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "One or more products no longer exist." },
      { status: 400 },
    );
  }

  const insufficient = products.filter(
    (p) => p.stock < (quantities.get(p.id) ?? 0),
  );
  if (insufficient.length > 0) {
    return NextResponse.json(
      {
        error: "Insufficient stock.",
        products: insufficient.map((p) => ({
          productId: p.id,
          name: p.name,
          available: p.stock,
        })),
      },
      { status: 409 },
    );
  }

  const totalCents = products.reduce(
    (sum, p) => sum + Math.round(Number(p.price) * 100) * quantities.get(p.id)!,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId: auth.session.user.id,
        status: "PENDING",
        total: totalCents / 100,
        items: {
          create: products.map((p) => ({
            productId: p.id,
            quantity: quantities.get(p.id)!,
            unitPrice: p.price,
          })),
        },
      },
    });
  });

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      metadata: { orderId: order.id, userId: auth.session.user.id },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    return NextResponse.json(
      {
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
        amount: totalCents,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[orders] PaymentIntent creation failed:", err);
    await prisma.order
      .update({ where: { id: order.id }, data: { status: "CANCELLED" } })
      .catch(() => undefined);
    return NextResponse.json(
      { error: "Failed to initialize payment." },
      { status: 502 },
    );
  }
}
