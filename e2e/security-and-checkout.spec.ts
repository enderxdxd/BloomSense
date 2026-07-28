import { expect, test } from "@playwright/test";
import { addSessionCookie } from "./helpers/session";

test("anonymous visitors are redirected before admin pages render", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin$/);
  await expect(
    page.getByRole("heading", { name: /welcome back/i }),
  ).toBeVisible();
});

test("customer sessions are blocked from admin pages", async ({
  page,
  context,
  baseURL,
}) => {
  await addSessionCookie(context, baseURL!, "CUSTOMER");

  const response = await page.goto("/admin");

  expect(response?.status()).toBe(403);
  await expect(page.getByText("Forbidden")).toBeVisible();
});

test("authenticated checkout shows persisted cart summary", async ({
  page,
  context,
  baseURL,
}) => {
  await addSessionCookie(context, baseURL!, "CUSTOMER");
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "bloomsense-cart",
      JSON.stringify({
        state: {
          items: [
            {
              id: "prod-blush",
              slug: "blush-garden-romance",
              name: "Blush Garden Romance",
              price: 89,
              imageUrl: "/images/products/blush-garden-romance.jpg",
              maxStock: 24,
              quantity: 2,
            },
          ],
        },
        version: 0,
      }),
    );
  });

  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(page.getByText(/Blush Garden Romance/)).toBeVisible();

  // 2 × $89 = $178 clears the $150 free-delivery threshold, so the
  // itemized summary reads subtotal $178 / delivery Free / total $178.
  const summary = page.getByRole("region", { name: /order summary/i });
  await expect(summary.getByText("Free")).toBeVisible();
  await expect(page.getByText("$178.00")).toHaveCount(3);
});

test("checkout requires delivery details before payment can start", async ({
  page,
  context,
  baseURL,
}) => {
  await addSessionCookie(context, baseURL!, "CUSTOMER");
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "bloomsense-cart",
      JSON.stringify({
        state: {
          items: [
            {
              id: "prod-posy",
              slug: "the-sunday-posy",
              name: "The Sunday Posy",
              price: 42,
              imageUrl: "/images/products/the-sunday-posy.jpg",
              maxStock: 40,
              quantity: 1,
            },
          ],
        },
        version: 0,
      }),
    );
  });

  await page.goto("/checkout");

  // $42 is under the threshold, so the $12 fee shows and the total is $54.
  await expect(page.getByText("$12.00")).toBeVisible();
  await expect(page.getByText("$54.00")).toBeVisible();

  // Empty delivery form → the payment step stays locked.
  const proceed = page.getByRole("button", { name: /proceed to payment/i });
  await expect(proceed).toBeDisabled();
  await expect(
    page.getByText(/fill in the delivery details/i),
  ).toBeVisible();

  await page.getByLabel(/recipient name/i).fill("Marco Silva");
  await page.getByLabel(/recipient phone/i).fill("+55 11 99999-0000");
  await page.getByLabel(/^address/i).fill("Rua das Flores 120");
  await page.getByLabel(/city/i).fill("Sao Paulo");
  await page.getByLabel(/postal code/i).fill("01310-100");

  await expect(proceed).toBeEnabled();
});

test("admin can update inventory stock with a seeded database", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_BACKEND_E2E !== "1",
    "Requires a seeded database and real local app env. Run with RUN_BACKEND_E2E=1.",
  );

  await addSessionCookie(context, baseURL!, "ADMIN");
  await page.goto("/admin/inventory");

  const stockInput = page.getByLabel(/Stock for Blush Garden Romance/i);
  await expect(stockInput).toBeVisible();

  const current = Number(await stockInput.inputValue());
  const next = String(Number.isFinite(current) ? current + 1 : 25);
  await stockInput.fill(next);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(stockInput).toHaveValue(next);
});
