"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CancelOrderButtonProps {
  orderId: string;
  /** Paid orders get refund wording; PENDING gets plain cancellation. */
  paid: boolean;
}

export function CancelOrderButton({ orderId, paid }: CancelOrderButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    const message = paid
      ? "Cancel this order and refund the full amount to your card?"
      : "Cancel this order?";
    if (!window.confirm(message)) return;

    setBusy(true);
    setError("");
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? `Cancellation failed (${res.status}).`);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error !== "" && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void cancel()}
        disabled={busy}
        className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {busy
          ? "Cancelling…"
          : paid
            ? "Cancel & refund"
            : "Cancel order"}
      </button>
    </div>
  );
}
