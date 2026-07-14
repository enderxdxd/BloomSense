import type { Metadata } from "next";
import { OrderPipeline } from "@/components/admin/OrderPipeline";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Orders — BloomSense Studio" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true, name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-bloom-primary">
          Order pipeline
        </h1>
        <p className="mt-1 text-sm text-bloom-rose">
          Advance confirmed orders through preparation, shipping and delivery.
        </p>
      </header>

      <OrderPipeline
        orders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          createdAt: o.createdAt.toISOString(),
          customer: o.user.name ?? o.user.email,
          items: o.items.map((i) => `${i.product.name} × ${i.quantity}`),
        }))}
      />
    </div>
  );
}
