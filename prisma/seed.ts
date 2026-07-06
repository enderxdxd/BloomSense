import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Category } from "../generated/prisma/enums";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface SeedProduct {
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  category: Category;
  imageUrl: string;
}

const PRODUCTS: SeedProduct[] = [
  // ------------------------------------------------------------- Bouquets
  {
    name: "Blush Garden Romance",
    slug: "blush-garden-romance",
    description:
      "A hand-tied bouquet of blush garden roses, ranunculus, and sweet peas softened with silver eucalyptus. Romantic without trying too hard.",
    price: "89.00",
    stock: 24,
    category: Category.BOUQUET,
    imageUrl: "/images/products/blush-garden-romance.jpg",
  },
  {
    name: "Golden Hour",
    slug: "golden-hour",
    description:
      "Toffee roses, butterscotch ranunculus, and dried grasses in warm amber tones — the bouquet equivalent of late-afternoon light.",
    price: "95.00",
    stock: 18,
    category: Category.BOUQUET,
    imageUrl: "/images/products/golden-hour.jpg",
  },
  {
    name: "Sage & Ivory",
    slug: "sage-and-ivory",
    description:
      "White O'Hara roses, lisianthus, and dusty miller wrapped in unbleached linen. Quiet, elegant, and endlessly photogenic.",
    price: "78.00",
    stock: 30,
    category: Category.BOUQUET,
    imageUrl: "/images/products/sage-and-ivory.jpg",
  },
  {
    name: "Wild Meadow",
    slug: "wild-meadow",
    description:
      "An unstructured gathering of cosmos, scabiosa, cornflowers, and feverfew — like something picked on a country walk, only better.",
    price: "68.00",
    stock: 22,
    category: Category.BOUQUET,
    imageUrl: "/images/products/wild-meadow.jpg",
  },
  {
    name: "Midnight Velvet",
    slug: "midnight-velvet",
    description:
      "Deep burgundy dahlias, black baccara roses, and plum carnations with smoke bush foliage. Dramatic, moody, unforgettable.",
    price: "110.00",
    stock: 12,
    category: Category.BOUQUET,
    imageUrl: "/images/products/midnight-velvet.jpg",
  },
  {
    name: "Citrus Punch",
    slug: "citrus-punch",
    description:
      "Coral charm peonies, orange ranunculus, and yellow craspedia — a bright, joyful burst for birthdays and good news.",
    price: "85.00",
    stock: 20,
    category: Category.BOUQUET,
    imageUrl: "/images/products/citrus-punch.jpg",
  },
  // -------------------------------------------------------- Arrangements
  {
    name: "The Low Compote",
    slug: "the-low-compote",
    description:
      "A sculptural centerpiece in a matte ceramic compote: garden roses, anemones, and trailing jasmine designed to be seen from every seat.",
    price: "135.00",
    stock: 10,
    category: Category.ARRANGEMENT,
    imageUrl: "/images/products/the-low-compote.jpg",
  },
  {
    name: "Ikebana Study No. 3",
    slug: "ikebana-study-no-3",
    description:
      "A minimalist line arrangement of Japanese sweet flag, a single anthurium, and curly willow in a black kenzan bowl.",
    price: "98.00",
    stock: 8,
    category: Category.ARRANGEMENT,
    imageUrl: "/images/products/ikebana-study-no-3.jpg",
  },
  {
    name: "English Cottage Urn",
    slug: "english-cottage-urn",
    description:
      "An abundant footed-urn arrangement of delphinium, stock, garden roses, and snapdragons — grand without being stiff.",
    price: "165.00",
    stock: 6,
    category: Category.ARRANGEMENT,
    imageUrl: "/images/products/english-cottage-urn.jpg",
  },
  {
    name: "Desert Modern",
    slug: "desert-modern",
    description:
      "Protea, banksia, dried palm fronds, and eucalyptus in a terracotta vessel. Lasts for weeks, looks like a gallery piece.",
    price: "120.00",
    stock: 14,
    category: Category.ARRANGEMENT,
    imageUrl: "/images/products/desert-modern.jpg",
  },
  {
    name: "Breakfast Nook Posy",
    slug: "breakfast-nook-posy",
    description:
      "A petite everyday arrangement of spray roses, waxflower, and mint in a recycled glass tumbler. Small joy, weekly habit.",
    price: "45.00",
    stock: 40,
    category: Category.ARRANGEMENT,
    imageUrl: "/images/products/breakfast-nook-posy.jpg",
  },
  // -------------------------------------------------------- Single stems
  {
    name: "King Protea Stem",
    slug: "king-protea-stem",
    description:
      "One architectural king protea, roughly the size of your hand. A statement in a bottle vase; dries beautifully too.",
    price: "18.00",
    stock: 35,
    category: Category.SINGLE_STEM,
    imageUrl: "/images/products/king-protea-stem.jpg",
  },
  {
    name: "Dinner Plate Dahlia",
    slug: "dinner-plate-dahlia",
    description:
      "A single café au lait dahlia at peak bloom — cream, blush, and impossible to stop looking at. Seasonal, limited.",
    price: "12.00",
    stock: 50,
    category: Category.SINGLE_STEM,
    imageUrl: "/images/products/dinner-plate-dahlia.jpg",
  },
  {
    name: "Heirloom Peony Stem",
    slug: "heirloom-peony-stem",
    description:
      "Sarah Bernhardt peony, sold in bud and guaranteed to open into a full ruffled bloom within two days.",
    price: "14.00",
    stock: 45,
    category: Category.SINGLE_STEM,
    imageUrl: "/images/products/heirloom-peony-stem.jpg",
  },
  {
    name: "Anthurium 'Mystique'",
    slug: "anthurium-mystique",
    description:
      "A sculptural blush-green anthurium with a two-week vase life. One stem is a whole aesthetic.",
    price: "16.00",
    stock: 28,
    category: Category.SINGLE_STEM,
    imageUrl: "/images/products/anthurium-mystique.jpg",
  },
  {
    name: "Garden Rose Trio",
    slug: "garden-rose-trio",
    description:
      "Three stems of scented David Austin garden roses in a color of the florist's choosing — trust us, they're gorgeous.",
    price: "24.00",
    stock: 32,
    category: Category.SINGLE_STEM,
    imageUrl: "/images/products/garden-rose-trio.jpg",
  },
  // ---------------------------------------------------- Wedding packages
  {
    name: "The Elopement Package",
    slug: "the-elopement-package",
    description:
      "One bridal bouquet, one boutonnière, and a petal toss bag. Everything two people need to get married beautifully.",
    price: "295.00",
    stock: 5,
    category: Category.WEDDING_PACKAGE,
    imageUrl: "/images/products/the-elopement-package.jpg",
  },
  {
    name: "The Intimate Wedding",
    slug: "the-intimate-wedding",
    description:
      "Bridal bouquet, two bridesmaid bouquets, four boutonnières, and two low centerpieces — sized for celebrations under thirty guests.",
    price: "850.00",
    stock: 3,
    category: Category.WEDDING_PACKAGE,
    imageUrl: "/images/products/the-intimate-wedding.jpg",
  },
  {
    name: "The Full Ceremony",
    slug: "the-full-ceremony",
    description:
      "Complete wedding florals: bridal party, ceremony arch, aisle markers, and six table centerpieces in your chosen palette.",
    price: "2400.00",
    stock: 2,
    category: Category.WEDDING_PACKAGE,
    imageUrl: "/images/products/the-full-ceremony.jpg",
  },
  {
    name: "Ceremony Arch Florals",
    slug: "ceremony-arch-florals",
    description:
      "An asymmetric floral installation for your arch or arbor: roses, hydrangea, delphinium, and trailing greenery, installed on-site.",
    price: "680.00",
    stock: 4,
    category: Category.WEDDING_PACKAGE,
    imageUrl: "/images/products/ceremony-arch-florals.jpg",
  },
];

async function main() {
  console.log(`Seeding ${PRODUCTS.length} products...`);

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        imageUrl: product.imageUrl,
        active: true,
      },
      create: { ...product, active: true },
    });
  }

  const count = await prisma.product.count();
  console.log(`Done. Product table now has ${count} rows.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
