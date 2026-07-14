import type { Metadata } from "next";
import { InventoryTable } from "@/components/admin/InventoryTable";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Inventory — BloomSense Studio" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-bloom-primary">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-bloom-rose">
          Stock edits apply immediately to the storefront.
        </p>
      </header>

      <InventoryTable
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: Number(p.price),
          stock: p.stock,
          category: p.category,
          imageUrl: p.imageUrl,
          active: p.active,
        }))}
      />
    </div>
  );
}
