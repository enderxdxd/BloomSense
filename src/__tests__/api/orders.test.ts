import { NextRequest } from "next/server";

const requireSessionMock = jest.fn();
jest.mock("@/lib/auth", () => ({
  requireSession: () => requireSessionMock(),
}));

const piCreateMock = jest.fn();
const stripeConfiguredMock = jest.fn(() => true);
jest.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfiguredMock(),
  getStripe: () => ({ paymentIntents: { create: piCreateMock } }),
}));

const productFindManyMock = jest.fn();
const orderCreateMock = jest.fn();
const orderUpdateMock = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: (...a: unknown[]) => productFindManyMock(...a) },
    order: {
      create: (...a: unknown[]) => orderCreateMock(...a),
      update: (...a: unknown[]) => orderUpdateMock(...a),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ order: { create: (...a: unknown[]) => orderCreateMock(...a) } }),
  },
}));

import { POST } from "@/app/api/orders/route";

const SESSION = {
  ok: true as const,
  session: { user: { id: "user_1", role: "CUSTOMER" } },
};

const DB_PRODUCTS = [
  { id: "prod_a", name: "Rose Bouquet", price: "89.00", stock: 5, active: true },
  { id: "prod_b", name: "Peony Cloud", price: "120.50", stock: 2, active: true },
];

/** Tomorrow in yyyy-mm-dd — the earliest bookable delivery date. */
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const VALID_DELIVERY = {
  recipientName: "Marco Silva",
  recipientPhone: "+55 11 99999-0000",
  addressLine1: "Rua das Flores 120",
  addressLine2: "Apto 4B",
  city: "Sao Paulo",
  postalCode: "01310-100",
  deliveryDate: tomorrow(),
  giftMessage: "Happy anniversary.",
};

/** Adds valid delivery details unless the test overrides them. */
function makeRequest(body: unknown): NextRequest {
  const payload =
    body && typeof body === "object" && !("delivery" in body)
      ? { ...(body as object), delivery: VALID_DELIVERY }
      : body;
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireSessionMock.mockResolvedValue(SESSION);
  stripeConfiguredMock.mockReturnValue(true);
  // Mirror Prisma's `where: { id: { in: [...] } }` filtering.
  productFindManyMock.mockImplementation(
    (args: { where: { id: { in: string[] } } }) =>
      Promise.resolve(
        DB_PRODUCTS.filter((p) => args.where.id.in.includes(p.id)),
      ),
  );
  orderCreateMock.mockResolvedValue({ id: "order_1" });
  orderUpdateMock.mockResolvedValue({});
  piCreateMock.mockResolvedValue({
    id: "pi_123",
    client_secret: "pi_123_secret",
  });
});

describe("POST /api/orders", () => {
  it("returns 401 without a session", async () => {
    requireSessionMock.mockResolvedValue({ ok: false, status: 401 });
    const res = await POST(
      makeRequest({ items: [{ productId: "prod_a", quantity: 1 }] }),
    );
    expect(res.status).toBe(401);
    expect(piCreateMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Stripe is not configured", async () => {
    stripeConfiguredMock.mockReturnValue(false);
    const res = await POST(
      makeRequest({ items: [{ productId: "prod_a", quantity: 1 }] }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a product does not exist", async () => {
    const res = await POST(
      makeRequest({
        items: [
          { productId: "prod_a", quantity: 1 },
          { productId: "prod_ghost", quantity: 1 },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when stock is insufficient", async () => {
    const res = await POST(
      makeRequest({ items: [{ productId: "prod_b", quantity: 3 }] }),
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as {
      products: Array<{ productId: string; available: number }>;
    };
    expect(json.products[0]).toMatchObject({
      productId: "prod_b",
      available: 2,
    });
  });

  it("creates order with DB prices and returns clientSecret", async () => {
    const res = await POST(
      makeRequest({
        items: [
          { productId: "prod_a", quantity: 2 },
          { productId: "prod_b", quantity: 1 },
        ],
      }),
    );
    expect(res.status).toBe(201);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.orderId).toBe("order_1");
    expect(json.clientSecret).toBe("pi_123_secret");
    // 2 × $89.00 + 1 × $120.50 = $298.50 → 29850 cents from DB prices,
    // regardless of anything the client claims.
    expect(json.amount).toBe(29850);

    expect(piCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 29850,
        currency: "usd",
        metadata: expect.objectContaining({ orderId: "order_1" }),
      }),
    );

    const createArgs = orderCreateMock.mock.calls[0][0];
    expect(createArgs.data.status).toBe("PENDING");
    expect(createArgs.data.userId).toBe("user_1");
    // Delivery details are persisted with the order.
    expect(createArgs.data.recipientName).toBe("Marco Silva");
    expect(createArgs.data.city).toBe("Sao Paulo");
    expect(createArgs.data.giftMessage).toBe("Happy anniversary.");
    // $298.50 clears the free-delivery threshold.
    expect(createArgs.data.deliveryFee).toBe(0);
  });

  it("adds the delivery fee below the free-shipping threshold", async () => {
    // 1 × $89.00 = $89.00 subtotal → under $150, so the $12 fee applies.
    const res = await POST(
      makeRequest({ items: [{ productId: "prod_a", quantity: 1 }] }),
    );
    expect(res.status).toBe(201);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.subtotal).toBe(8900);
    expect(json.deliveryFee).toBe(1200);
    expect(json.amount).toBe(10100);
    // Stripe is charged the total INCLUDING delivery.
    expect(piCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10100 }),
    );
  });

  it("rejects an order with no delivery details", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_a", quantity: 1 }],
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(orderCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a delivery date in the past", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      makeRequest({
        items: [{ productId: "prod_a", quantity: 1 }],
        delivery: {
          ...VALID_DELIVERY,
          deliveryDate: yesterday.toISOString().slice(0, 10),
        },
      }),
    );
    expect(res.status).toBe(400);
    expect(orderCreateMock).not.toHaveBeenCalled();
    expect(piCreateMock).not.toHaveBeenCalled();
  });

  it("merges duplicate product lines", async () => {
    const res = await POST(
      makeRequest({
        items: [
          { productId: "prod_a", quantity: 2 },
          { productId: "prod_a", quantity: 3 },
        ],
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { amount: number };
    expect(json.amount).toBe(5 * 8900);
  });

  it("cancels the order when PaymentIntent creation fails", async () => {
    piCreateMock.mockRejectedValue(new Error("stripe down"));
    const res = await POST(
      makeRequest({ items: [{ productId: "prod_a", quantity: 1 }] }),
    );
    expect(res.status).toBe(502);
    expect(orderUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: { status: "CANCELLED" },
      }),
    );
  });
});
