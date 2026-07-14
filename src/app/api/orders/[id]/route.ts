import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

/** Order detail — strictly owner-only (security requirement #9). */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: auth.status },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, imageUrl: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    },
  });
}
