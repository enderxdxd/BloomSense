/** Delivery pricing and scheduling rules, shared by the API and the UI. */

export const DELIVERY_FEE_CENTS = 1200;
/** Orders at or above this subtotal ship free. */
export const FREE_DELIVERY_THRESHOLD_CENTS = 15000;
/** Same-day cutoff: everything is arranged the morning it's delivered. */
export const MIN_LEAD_DAYS = 1;
export const MAX_LEAD_DAYS = 60;

export function deliveryFeeCents(subtotalCents: number): number {
  return subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;
}

/** yyyy-mm-dd of the earliest date the shop will deliver. */
export function earliestDeliveryDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + MIN_LEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

export function latestDeliveryDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + MAX_LEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * Validates a yyyy-mm-dd delivery date against the booking window.
 * Compared as plain dates so a customer's timezone can't push a valid
 * choice out of range.
 */
export function isDeliveryDateBookable(
  isoDate: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  return isoDate >= earliestDeliveryDate(now) && isoDate <= latestDeliveryDate(now);
}
