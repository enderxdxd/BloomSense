"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryLabel } from "@/lib/catalog-shared";

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  active: boolean;
}

const CATEGORIES = [
  "BOUQUET",
  "ARRANGEMENT",
  "SINGLE_STEM",
  "WEDDING_PACKAGE",
] as const;

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; product: AdminProduct };

export function InventoryTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [error, setError] = useState("");

  async function patchProduct(id: string, patch: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Update failed (${res.status}).`);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {error !== "" ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-full bg-bloom-primary px-5 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
        >
          New product
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-bloom-gold/30 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-bloom-cream text-[10px] uppercase tracking-[0.18em] text-bloom-sage">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <InventoryRow
                key={product.id}
                product={product}
                onPatch={patchProduct}
                onEdit={() => setModal({ mode: "edit", product })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {modal.mode !== "closed" && (
        <ProductFormModal
          product={modal.mode === "edit" ? modal.product : null}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={() => {
            setModal({ mode: "closed" });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface InventoryRowProps {
  product: AdminProduct;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onEdit: () => void;
}

function InventoryRow({ product, onPatch, onEdit }: InventoryRowProps) {
  const [stockDraft, setStockDraft] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);

  const dirty = Number(stockDraft) !== product.stock;

  async function saveStock() {
    const value = Number(stockDraft);
    if (!Number.isInteger(value) || value < 0) {
      setStockDraft(String(product.stock));
      return;
    }
    setSaving(true);
    const ok = await onPatch(product.id, { stock: value });
    if (!ok) setStockDraft(String(product.stock));
    setSaving(false);
  }

  return (
    <tr className="border-b border-bloom-cream/60 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-bloom-primary">{product.name}</p>
        <p className="text-xs text-bloom-rose">/{product.slug}</p>
      </td>
      <td className="px-4 py-3 text-bloom-primary/80">
        {categoryLabel(product.category)}
      </td>
      <td className="px-4 py-3 text-bloom-primary">
        ${product.price.toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={stockDraft}
            onChange={(e) => setStockDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveStock();
            }}
            aria-label={`Stock for ${product.name}`}
            className={`w-20 rounded-lg border px-2.5 py-1.5 text-sm outline-none ${
              product.stock < 5
                ? "border-bloom-gold bg-bloom-gold/10"
                : "border-bloom-gold/40 bg-white"
            } text-bloom-primary focus:border-bloom-primary`}
          />
          {dirty && (
            <button
              type="button"
              onClick={() => void saveStock()}
              disabled={saving}
              className="rounded-full bg-bloom-sage px-3 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "…" : "Save"}
            </button>
          )}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            product.active
              ? "bg-bloom-sage/25 text-bloom-primary"
              : "bg-red-100 text-red-800"
          }`}
        >
          {product.active ? "active" : "inactive"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-bloom-gold/40 px-3 py-1 text-xs text-bloom-primary transition hover:bg-bloom-cream"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void onPatch(product.id, { active: !product.active })}
            className="rounded-full border border-bloom-rose/40 px-3 py-1 text-xs text-bloom-rose transition hover:bg-bloom-cream"
          >
            {product.active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

interface ProductFormModalProps {
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = product !== null;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    stock: product ? String(product.stock) : "0",
    category: product?.category ?? "BOUQUET",
    imageUrl: product?.imageUrl ?? "/images/products/placeholder.jpg",
    active: product?.active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category,
      imageUrl: form.imageUrl.trim(),
      active: form.active,
    };

    const res = await fetch(
      isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Save failed (${res.status}).`);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? `Edit ${product.name}` : "New product"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bloom-primary/30 backdrop-blur-[2px]"
      />
      <form
        onSubmit={submit}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="font-serif text-xl font-semibold text-bloom-primary">
          {isEdit ? "Edit product" : "New product"}
        </h2>

        <div className="mt-5 space-y-4">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                update(
                  isEdit ? { name } : { name, slug: slugify(name) },
                );
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={form.slug}
              onChange={(e) => update({ slug: e.target.value })}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (USD)">
              <input
                required
                type="number"
                min={0.5}
                step="0.01"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Stock">
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.stock}
                onChange={(e) => update({ stock: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Image URL">
            <input
              required
              value={form.imageUrl}
              onChange={(e) => update({ imageUrl: e.target.value })}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-bloom-primary">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update({ active: e.target.checked })}
              className="h-4 w-4 accent-bloom-primary"
            />
            Visible in the storefront
          </label>
        </div>

        {error !== "" && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-bloom-rose/40 px-5 py-2.5 text-sm text-bloom-rose transition hover:bg-bloom-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-bloom-primary px-6 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none focus:border-bloom-primary";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
        {label}
      </span>
      {children}
    </label>
  );
}
