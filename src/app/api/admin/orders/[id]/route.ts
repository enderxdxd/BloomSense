import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  createStripeRefund,
  finalizeCancellation,
  RefundUnavailableError,
} from "@/lib/order-actions";
import { prisma } from "@/lib/prisma";
import { OrderStatusUpdateSchema } from "@/lib/schema";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

/**
 * Legal status transitions for the fulfillment pipeline. CONFIRMED comes
 * only from the Stripe webhook; admins move orders forward, cancel before
 * shipment, or refund any paid order (a REFUNDED target triggers a real
 * Stripe refund plus restock).
 */
const LEGAL_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireRole("FLORIST", "ADMIN");
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden." }, { status: auth.status });
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

  const parsed = OrderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const allowed = LEGAL_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      {
        error: `Illegal transition ${order.status} → ${parsed.data.status}.`,
        allowed,
      },
      { status: 422 },
    );
  }

  // A refund target is an action, not just a label: Stripe refund first,
  // then state flip + restock in one transaction.
  if (parsed.data.status === "REFUNDED") {
    try {
      const refundId = await createStripeRefund(order);
      const updated = await finalizeCancellation({
        orderId: order.id,
        toStatus: "REFUNDED",
        stripeRefundId: refundId,
      });
      return NextResponse.json({
        order: {
          id: order.id,
          status: updated?.status ?? "REFUNDED",
          total: Number(order.total),
        },
        refundId,
      });
    } catch (err) {
      if (err instanceof RefundUnavailableError) {
        return NextResponse.json({ error: err.message }, { status: 503 });
      }
      console.error("[admin/orders] Refund failed:", err);
      return NextResponse.json(
        { error: "Refund failed — order unchanged." },
        { status: 502 },
      );
    }
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({
    order: {
      id: updated.id,
      status: updated.status,
      total: Number(updated.total),
    },
  });
}
