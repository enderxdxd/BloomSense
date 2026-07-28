import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SavedProfileList } from "@/components/account/SavedProfileList";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your account — BloomSense" };
export const dynamic = "force-dynamic";

const SAVED_LIMIT = 3;

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const [profiles, orders] = await Promise.all([
    prisma.floralProfile.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        occasion: true,
        flowerTypes: true,
        palette: true,
        arrangement: true,
        moodBoardUrl: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, total: true, createdAt: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            Your account
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary">
            {session.user.name ?? session.user.email}
          </h1>
          <p className="mt-2 text-sm text-bloom-rose">{session.user.email}</p>
        </header>

        <section aria-labelledby="saved-quizzes" className="mt-10">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2
              id="saved-quizzes"
              className="font-serif text-2xl font-semibold text-bloom-primary"
            >
              Saved quizzes
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                profiles.length >= SAVED_LIMIT
                  ? "bg-bloom-gold/25 text-bloom-primary"
                  : "bg-bloom-sage/20 text-bloom-primary"
              }`}
            >
              {profiles.length} of {SAVED_LIMIT} slots used
            </span>
          </div>
          {profiles.length >= SAVED_LIMIT && (
            <p className="mb-4 rounded-xl border border-bloom-gold/40 bg-bloom-gold/10 px-4 py-3 text-sm text-bloom-primary">
              Your account is full — new quiz results won&apos;t be saved until
              you delete one below.
            </p>
          )}
          <SavedProfileList
            profiles={profiles.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
            }))}
            limit={SAVED_LIMIT}
          />
        </section>

        <section aria-labelledby="recent-orders" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2
              id="recent-orders"
              className="font-serif text-2xl font-semibold text-bloom-primary"
            >
              Recent orders
            </h2>
            <Link
              href="/orders"
              className="text-sm text-bloom-rose underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-bloom-gold/30 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-bloom-rose">
                No orders yet —{" "}
                <Link href="/catalog" className="underline underline-offset-2">
                  browse the catalog
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}/confirmation`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-bloom-gold/30 bg-white px-5 py-4 shadow-sm transition hover:border-bloom-rose"
                  >
                    <span className="text-sm text-bloom-primary">
                      #{order.id.slice(-8)} ·{" "}
                      {order.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="font-serif text-lg font-semibold text-bloom-primary">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
