"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useState } from "react";
import {
  cartSubtotal,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

interface OrderData {
  orderId: string;
  clientSecret: string;
  amount: number;
}

export default function CheckoutPage() {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  if (!hydrated) return null;

  if (items.length === 0 && !order) {
    return (
      <CheckoutShell>
        <p className="text-sm text-bloom-rose">
          Your cart is empty.{" "}
          <Link href="/catalog" className="underline underline-offset-2">
            Browse the catalog
          </Link>{" "}
          to add arrangements.
        </p>
      </CheckoutShell>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <CheckoutShell>
        <p className="rounded-xl border border-bloom-gold/40 bg-bloom-cream p-4 text-sm text-bloom-primary">
          Payments aren&apos;t configured yet — the server is missing the
          Stripe keys. Add <code>STRIPE_SECRET_KEY</code> and{" "}
          <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to enable checkout.
        </p>
      </CheckoutShell>
    );
  }

  async function createOrder() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/checkout")}`;
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Checkout failed (${res.status}).`,
        );
      }

      setOrder({
        orderId: String(data.orderId),
        clientSecret: String(data.clientSecret),
        amount: Number(data.amount),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <CheckoutShell>
      <div className="grid gap-8 lg:grid-cols-[1fr,1.2fr]">
        <section aria-labelledby="summary-heading">
          <h2
            id="summary-heading"
            className="text-xs font-medium uppercase tracking-[0.28em] text-bloom-sage"
          >
            Order summary
          </h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-bloom-primary">
                  {item.name}{" "}
                  <span className="text-bloom-rose">× {item.quantity}</span>
                </span>
                <span className="font-medium text-bloom-primary">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-bloom-cream pt-4">
            <span className="text-sm text-bloom-rose">Total</span>
            <span className="font-serif text-2xl font-semibold text-bloom-primary">
              $
              {(order ? order.amount / 100 : cartSubtotal(items)).toFixed(2)}
            </span>
          </div>
          <p className="mt-2 text-xs text-bloom-rose/80">
            Prices verified against the live catalog at order creation.
          </p>
        </section>

        <section aria-label="Payment">
          {order === null ? (
            <div className="flex h-full flex-col items-start justify-center gap-4">
              {error !== "" && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={createOrder}
                disabled={creating}
                className="rounded-full bg-bloom-primary px-8 py-3.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:opacity-60"
              >
                {creating ? "Preparing payment…" : "Proceed to payment"}
              </button>
              <p className="text-xs text-bloom-rose/80">
                Test mode: use card 4242 4242 4242 4242, any future date, any
                CVC.
              </p>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: order.clientSecret,
                appearance: {
                  variables: {
                    colorPrimary: "#6D2E46",
                    colorBackground: "#ffffff",
                    colorText: "#6D2E46",
                    borderRadius: "12px",
                  },
                },
              }}
            >
              <PaymentForm orderId={order.orderId} />
            </Elements>
          )}
        </section>
      </div>
    </CheckoutShell>
  );
}

function PaymentForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError("");

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}/confirmation`,
      },
    });

    // Only reached on immediate failure — success navigates away.
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error !== "" && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-bloom-primary px-8 py-3.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:opacity-60"
      >
        {submitting ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary">
            Checkout
          </h1>
        </header>
        <div className="rounded-3xl border border-bloom-gold/30 bg-white p-6 shadow-sm sm:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}
