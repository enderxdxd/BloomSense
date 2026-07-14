const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-bloom-gold/25 text-bloom-primary",
  CONFIRMED: "bg-bloom-sage/25 text-bloom-primary",
  PREPARING: "bg-bloom-rose/20 text-bloom-primary",
  SHIPPED: "bg-bloom-primary/15 text-bloom-primary",
  DELIVERED: "bg-bloom-sage/40 text-bloom-primary",
  CANCELLED: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
        STATUS_STYLES[status] ?? "bg-bloom-cream text-bloom-primary"
      }`}
    >
      {status.toLowerCase()}
    </span>
  );
}
