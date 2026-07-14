import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your orders — BloomSense" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { select: { name: true } } } },
    },
  });

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary">
            Your orders
          </h1>
        </header>

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-bloom-gold/30 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-bloom-rose">
              No orders yet.{" "}
              <Link href="/catalog" className="underline underline-offset-2">
                Browse the catalog
              </Link>{" "}
              to place your first one.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}/confirmation`}
                  className="block rounded-2xl border border-bloom-gold/30 bg-white p-5 shadow-sm transition hover:border-bloom-rose"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-bloom-rose">
                        {order.createdAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        · #{order.id.slice(-8)}
                      </p>
                      <p className="mt-1 text-sm text-bloom-primary">
                        {order.items
                          .map(
                            (i) => `${i.product.name} × ${i.quantity}`,
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <OrderStatusBadge status={order.status} />
                      <span className="font-serif text-lg font-semibold text-bloom-primary">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
