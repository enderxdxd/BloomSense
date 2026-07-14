import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "../../../generated/prisma/enums";

export const metadata: Metadata = { title: "Dashboard — BloomSense Studio" };
export const dynamic = "force-dynamic";

const PAID_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];
const DAYS_IN_CHART = 14;

export default async function AdminDashboardPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const chartStart = new Date(now.getTime() - DAYS_IN_CHART * 24 * 60 * 60 * 1000);
  chartStart.setHours(0, 0, 0, 0);

  const [paidOrders, ordersThisWeek, pendingCount, lowStock] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { in: PAID_STATUSES } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.product.findMany({
        where: { active: true, stock: { lt: 5 } },
        orderBy: { stock: "asc" },
        select: { id: true, name: true, slug: true, stock: true },
      }),
    ]);

  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

  // Revenue by day for the last 14 days.
  const byDay = new Map<string, number>();
  for (let i = 0; i < DAYS_IN_CHART; i++) {
    const d = new Date(chartStart.getTime() + i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of paidOrders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + Number(order.total));
    }
  }
  const chartData = [...byDay.entries()].map(([date, total]) => ({
    date,
    total,
  }));

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-bloom-primary">
          Dashboard
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue (paid orders)" value={`$${revenue.toFixed(2)}`} />
        <StatCard label="Orders this week" value={String(ordersThisWeek)} />
        <StatCard label="Awaiting payment" value={String(pendingCount)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr,1fr]">
        <section className="rounded-2xl border border-bloom-gold/30 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-[0.24em] text-bloom-sage">
            Revenue · last {DAYS_IN_CHART} days
          </h2>
          <RevenueChart data={chartData} />
        </section>

        <section className="rounded-2xl border border-bloom-gold/30 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-[0.24em] text-bloom-sage">
            Low stock (&lt; 5)
          </h2>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-bloom-rose">
              Everything is well stocked.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/product/${p.slug}`}
                    className="truncate text-bloom-primary hover:text-bloom-rose"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.stock === 0
                        ? "bg-red-100 text-red-800"
                        : "bg-bloom-gold/25 text-bloom-primary"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bloom-gold/30 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-bloom-sage">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-bloom-primary">
        {value}
      </p>
    </div>
  );
}

/** Dependency-free SVG bar chart (deliberate: recharts would add ~100KB
 * to the admin bundle for a single visual). */
function RevenueChart({ data }: { data: Array<{ date: string; total: number }> }) {
  const width = 560;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.total), 1);
  const barW = innerW / data.length - 6;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Bar chart of daily revenue for the last ${data.length} days`}
      className="mt-3 w-full"
    >
      {data.map((d, i) => {
        const barH = Math.max((d.total / max) * innerH, d.total > 0 ? 3 : 0);
        const x = padding.left + i * (innerW / data.length) + 3;
        const y = padding.top + innerH - barH;
        const day = d.date.slice(8, 10);
        return (
          <g key={d.date}>
            <title>{`${d.date}: $${d.total.toFixed(2)}`}</title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill="#496F50"
              opacity={d.total > 0 ? 0.9 : 0.25}
            />
            {d.total === 0 && (
              <rect
                x={x}
                y={padding.top + innerH - 2}
                width={barW}
                height={2}
                fill="#7F6334"
                opacity={0.5}
              />
            )}
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#8F4F54"
            >
              {day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
