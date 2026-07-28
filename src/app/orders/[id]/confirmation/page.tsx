import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CancelOrderButton } from "@/components/shop/CancelOrderButton";
import { ClearCartOnMount } from "@/components/shop/ClearCartOnMount";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Order confirmation — BloomSense" };
export const dynamic = "force-dynamic";

const TIMELINE = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
] as const;

interface ConfirmationPageProps {
  params: { id: string };
}

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/orders/${params.id}/confirmation`);
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!order) notFound();
  // Ownership: another user's order id must never render.
  if (order.userId !== session.user.id) notFound();

  const refunded = order.status === "REFUNDED";
  const cancelled = order.status === "CANCELLED" || refunded;
  const cancellable = ["PENDING", "CONFIRMED", "PREPARING"].includes(
    order.status,
  );
  const currentStep = TIMELINE.indexOf(
    order.status as (typeof TIMELINE)[number],
  );

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <ClearCartOnMount />
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            {refunded
              ? "Order refunded"
              : cancelled
                ? "Order cancelled"
                : "Thank you"}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary">
            {refunded
              ? "Your money is on its way back"
              : cancelled
                ? "This order was cancelled"
                : "Your flowers are on the way"}
          </h1>
          {refunded && (
            <p className="mx-auto mt-3 max-w-md text-sm text-bloom-rose">
              The full amount was refunded to your card — most banks post it
              within 5–10 business days.
            </p>
          )}
          <p className="mt-3 text-sm text-bloom-rose">
            Order #{order.id.slice(-8)} ·{" "}
            {order.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <div className="rounded-3xl border border-bloom-gold/30 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrderStatusBadge status={order.status} />
            {order.status === "PENDING" && (
              <p className="text-xs text-bloom-rose">
                Payment confirmation can take a few seconds —{" "}
                <Link
                  href={`/orders/${order.id}/confirmation`}
                  className="underline underline-offset-2"
                >
                  refresh
                </Link>
                .
              </p>
            )}
            {cancellable && (
              <CancelOrderButton
                orderId={order.id}
                paid={order.status !== "PENDING"}
              />
            )}
          </div>

          {!cancelled && (
            <ol className="mt-6 flex items-center gap-1" aria-label="Order progress">
              {TIMELINE.map((step, i) => (
                <li key={step} className="flex flex-1 items-center gap-1">
                  <span
                    className={`h-2 w-full rounded-full ${
                      i <= currentStep ? "bg-bloom-sage" : "bg-bloom-cream"
                    }`}
                    title={step.toLowerCase()}
                  />
                </li>
              ))}
            </ol>
          )}

          <ul className="mt-8 space-y-3 border-t border-bloom-cream pt-6">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <Link
                  href={`/product/${item.product.slug}`}
                  className="text-bloom-primary hover:text-bloom-rose"
                >
                  {item.product.name}{" "}
                  <span className="text-bloom-rose">× {item.quantity}</span>
                </Link>
                <span className="font-medium text-bloom-primary">
                  ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-bloom-cream pt-5">
            <span className="text-sm text-bloom-rose">Total</span>
            <span className="font-serif text-2xl font-semibold text-bloom-primary">
              ${Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/orders"
            className="text-sm text-bloom-rose underline underline-offset-2 hover:text-bloom-primary"
          >
            View all orders
          </Link>
        </p>
      </div>
    </main>
  );
}
