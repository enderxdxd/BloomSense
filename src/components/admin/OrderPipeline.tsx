"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";

export interface PipelineOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  customer: string;
  items: string[];
}

const COLUMNS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

/** Mirror of the server-side legal transition map (UI affordance only —
 * the API re-validates every transition). */
const NEXT_ACTION: Record<string, { to: string; label: string } | undefined> = {
  CONFIRMED: { to: "PREPARING", label: "Start preparing" },
  PREPARING: { to: "SHIPPED", label: "Mark shipped" },
  SHIPPED: { to: "DELIVERED", label: "Mark delivered" },
};

const CANCELLABLE = new Set(["PENDING", "CONFIRMED", "PREPARING"]);

export function OrderPipeline({ orders }: { orders: PipelineOrder[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function transition(orderId: string, status: string) {
    setBusyId(orderId);
    setError("");
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Transition failed (${res.status}).`);
    } else {
      router.refresh();
    }
    setBusyId(null);
  }

  return (
    <div>
      {error !== "" && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter((o) => o.status === column);
          return (
            <section
              key={column}
              aria-label={`${column.toLowerCase()} orders`}
              className="rounded-2xl border border-bloom-gold/30 bg-white p-4 shadow-sm"
            >
              <header className="mb-3 flex items-center justify-between">
                <OrderStatusBadge status={column} />
                <span className="text-xs text-bloom-rose">
                  {columnOrders.length}
                </span>
              </header>

              {columnOrders.length === 0 ? (
                <p className="py-4 text-center text-xs text-bloom-rose/70">
                  Nothing here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {columnOrders.map((order) => {
                    const next = NEXT_ACTION[order.status];
                    return (
                      <li
                        key={order.id}
                        className="rounded-xl border border-bloom-cream p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-bloom-primary">
                            #{order.id.slice(-8)}
                          </p>
                          <p className="text-xs text-bloom-rose">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-bloom-rose">
                          {order.customer}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-bloom-primary/75">
                          {order.items.join(", ")}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-bloom-primary">
                            ${order.total.toFixed(2)}
                          </span>
                          <div className="flex gap-1.5">
                            {CANCELLABLE.has(order.status) && (
                              <button
                                type="button"
                                disabled={busyId === order.id}
                                onClick={() =>
                                  void transition(order.id, "CANCELLED")
                                }
                                className="rounded-full border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                            {next && (
                              <button
                                type="button"
                                disabled={busyId === order.id}
                                onClick={() =>
                                  void transition(order.id, next.to)
                                }
                                className="rounded-full bg-bloom-primary px-2.5 py-1 text-[10px] font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:opacity-50"
                              >
                                {busyId === order.id ? "…" : next.label}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
