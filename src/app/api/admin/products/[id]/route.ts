import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductUpdateSchema } from "@/lib/schema";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

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

  const parsed = ProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product patch.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugTaken) {
      return NextResponse.json(
        { error: "A product with this slug already exists." },
        { status: 409 },
      );
    }
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({
    product: { ...product, price: Number(product.price) },
  });
}

/** Soft delete: flips `active` off so order history keeps its references. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireRole("FLORIST", "ADMIN");
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden." }, { status: auth.status });
  }

  const existing = await prisma.product.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({
    product: { ...product, price: Number(product.price) },
  });
}
