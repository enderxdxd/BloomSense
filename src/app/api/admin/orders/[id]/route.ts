import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatusUpdateSchema } from "@/lib/schema";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

/**
 * Legal status transitions for the fulfillment pipeline. CONFIRMED comes
 * only from the Stripe webhook; admins move orders forward (or cancel
 * before shipment).
 */
const LEGAL_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
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
