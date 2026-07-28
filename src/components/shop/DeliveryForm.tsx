"use client";

import {
  earliestDeliveryDate,
  latestDeliveryDate,
} from "@/lib/delivery";

export interface DeliveryDraft {
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  deliveryDate: string;
  giftMessage: string;
}

export function emptyDelivery(): DeliveryDraft {
  return {
    recipientName: "",
    recipientPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    deliveryDate: earliestDeliveryDate(),
    giftMessage: "",
  };
}

/** Mirrors the server-side Zod rules so the button can gate on validity. */
export function isDeliveryComplete(d: DeliveryDraft): boolean {
  return (
    d.recipientName.trim().length >= 2 &&
    d.recipientPhone.trim().length >= 6 &&
    d.addressLine1.trim().length >= 4 &&
    d.city.trim().length >= 2 &&
    d.postalCode.trim().length >= 3 &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.deliveryDate) &&
    d.deliveryDate >= earliestDeliveryDate() &&
    d.deliveryDate <= latestDeliveryDate()
  );
}

interface DeliveryFormProps {
  value: DeliveryDraft;
  onChange: (patch: Partial<DeliveryDraft>) => void;
  disabled?: boolean;
}

export function DeliveryForm({ value, onChange, disabled }: DeliveryFormProps) {
  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-70">
      <legend className="text-xs font-medium uppercase tracking-[0.28em] text-bloom-sage">
        Delivery details
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recipient name" required>
          <input
            required
            value={value.recipientName}
            onChange={(e) => onChange({ recipientName: e.target.value })}
            placeholder="Who receives the flowers"
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label="Recipient phone" required>
          <input
            required
            type="tel"
            value={value.recipientPhone}
            onChange={(e) => onChange({ recipientPhone: e.target.value })}
            placeholder="For the courier"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Address" required>
        <input
          required
          value={value.addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          placeholder="Street and number"
          autoComplete="address-line1"
          className={inputClass}
        />
      </Field>

      <Field label="Apartment, floor, notes">
        <input
          value={value.addressLine2}
          onChange={(e) => onChange({ addressLine2: e.target.value })}
          placeholder="Optional"
          autoComplete="address-line2"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" required>
          <input
            required
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            autoComplete="address-level2"
            className={inputClass}
          />
        </Field>
        <Field label="Postal code" required>
          <input
            required
            value={value.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            autoComplete="postal-code"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Delivery date" required>
        <input
          required
          type="date"
          value={value.deliveryDate}
          min={earliestDeliveryDate()}
          max={latestDeliveryDate()}
          onChange={(e) => onChange({ deliveryDate: e.target.value })}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-bloom-rose">
          Everything is arranged the morning it&apos;s delivered, so the
          earliest date is tomorrow.
        </span>
      </Field>

      <Field label="Card message">
        <textarea
          rows={3}
          maxLength={300}
          value={value.giftMessage}
          onChange={(e) => onChange({ giftMessage: e.target.value })}
          placeholder="Handwritten on a card and tucked into the stems."
          className={`${inputClass} resize-none`}
        />
        <span className="mt-1 block text-right text-xs text-bloom-rose">
          {value.giftMessage.length}/300
        </span>
      </Field>
    </fieldset>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-primary";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
        {label}
        {required && <span aria-hidden> *</span>}
      </span>
      {children}
    </label>
  );
}
