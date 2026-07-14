import { expect, test } from "@playwright/test";

test("quiz generates a profile and catalog recommendations", async ({
  page,
}) => {
  await page.route("**/api/quiz/submit", async (route) => {
    const payload = route.request().postDataJSON() as {
      occasion?: string;
      budgetUSD?: number;
    };

    expect(payload.occasion).toBe("wedding");
    expect(payload.budgetUSD).toBe(250);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        profile: {
          profileName: "Modern Romance",
          tagline: "Soft garden texture with a tailored finish.",
          description:
            "Your arrangement should feel romantic, intentional, and polished.",
          narrative:
            "For this wedding moment, the palette leans into blush, ivory, and sage with garden roses as the emotional center. Ranunculus keeps the arrangement airy while lisianthus gives it a quiet ceremony softness. The shape should feel composed rather than stiff, with movement around the edges and a refined hand-tied finish.",
          dominantFlowers: ["garden rose", "ranunculus", "lisianthus"],
          signatureFlower: "garden rose",
          colorPalette: ["blush", "ivory", "sage"],
          moodKeywords: ["romantic", "polished", "soft"],
          recommendedArrangementStyle: "hand-tied",
          stylingNotes: [
            "Wrap stems in ivory ribbon for a clean ceremony finish.",
            "Keep vessels low so the flowers frame faces at the table.",
            "Repeat sage foliage in small accents for visual continuity.",
          ],
        },
        recommendations: [
          {
            id: "prod-blush",
            slug: "blush-garden-romance",
            name: "Blush Garden Romance",
            price: 89,
            imageUrl: "/images/products/blush-garden-romance.jpg",
            category: "BOUQUET",
            stock: 24,
            reason:
              "Its blush garden roses and soft greenery echo the profile's ceremony mood.",
          },
          {
            id: "prod-sage",
            slug: "sage-and-ivory",
            name: "Sage & Ivory",
            price: 78,
            imageUrl: "/images/products/sage-and-ivory.jpg",
            category: "BOUQUET",
            stock: 30,
            reason:
              "The ivory and sage story gives the profile an elegant floral anchor.",
          },
          {
            id: "prod-compote",
            slug: "the-low-compote",
            name: "The Low Compote",
            price: 135,
            imageUrl: "/images/products/the-low-compote.jpg",
            category: "ARRANGEMENT",
            stock: 10,
            reason:
              "A low centerpiece keeps the romantic palette close to the table.",
          },
        ],
      }),
    });
  });

  await page.route("**/api/profile/hero", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23f9f5f0'/%3E%3C/svg%3E",
      }),
    }),
  );
  await page.route("**/api/profile/scene", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'%3E%3Crect width='3' height='2' fill='%23f9f5f0'/%3E%3C/svg%3E",
      }),
    }),
  );

  await page.goto("/quiz");

  await page.getByRole("button", { name: /wedding/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: "romantic" }).click();
  await page.getByRole("button", { name: "modern" }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: "blush" }).click();
  await page.getByRole("button", { name: "ivory" }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByLabel(/budget/i).fill("250");
  await page.getByLabel(/recipient/i).fill("partner");
  await page.getByRole("button", { name: /generate my profile/i }).click();

  await expect(
    page.getByRole("heading", { name: "Modern Romance" }),
  ).toBeVisible();
  await expect(page.getByText("Matched for you")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Blush Garden Romance/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /visualize my arrangement/i }),
  ).toBeVisible();
});
