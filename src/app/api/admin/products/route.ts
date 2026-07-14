import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductCreateSchema } from "@/lib/schema";

export const runtime = "nodejs";

/** Full product list for the admin table (includes inactive). */
export async function GET() {
  const auth = await requireRole("FLORIST", "ADMIN");
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden." }, { status: auth.status });
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    products: products.map((p) => ({ ...p, price: Number(p.price) })),
  });
}

export async function POST(req: NextRequest) {
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

  const parsed = ProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product data.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A product with this slug already exists." },
      { status: 409 },
    );
  }

  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(
    { product: { ...product, price: Number(product.price) } },
    { status: 201 },
  );
}
