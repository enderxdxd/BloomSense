import { NextRequest } from "next/server";

const constructEventMock = jest.fn();
const stripeConfiguredMock = jest.fn(() => true);
jest.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfiguredMock(),
  getStripe: () => ({ webhooks: { constructEvent: constructEventMock } }),
}));

const orderFindUniqueMock = jest.fn();
const orderUpdateMock = jest.fn();
const orderUpdateManyMock = jest.fn();
const productUpdateManyMock = jest.fn();

const txMock = {
  order: {
    findUnique: (...a: unknown[]) => orderFindUniqueMock(...a),
    update: (...a: unknown[]) => orderUpdateMock(...a),
  },
  product: {
    updateMany: (...a: unknown[]) => productUpdateManyMock(...a),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock),
    order: {
      updateMany: (...a: unknown[]) => orderUpdateManyMock(...a),
    },
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function makeRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) headers["stripe-signature"] = signature;
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  stripeConfiguredMock.mockReturnValue(true);
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  productUpdateManyMock.mockResolvedValue({ count: 1 });
  orderUpdateMock.mockResolvedValue({});
  orderUpdateManyMock.mockResolvedValue({ count: 1 });
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 503 when webhook secret is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(503);
  });

  it("rejects requests without a signature header", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
    expect(orderUpdateMock).not.toHaveBeenCalled();
  });

  it("confirms the order and decrements stock on payment_intent.succeeded", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: { id: "pi_1", metadata: { orderId: "order_1" } },
      },
    });
    orderFindUniqueMock.mockResolvedValue({
      id: "order_1",
      status: "PENDING",
      items: [
        { productId: "prod_a", quantity: 2 },
        { productId: "prod_b", quantity: 1 },
      ],
    });

    const res = await POST(makeRequest("{}", "good-sig"));
    expect(res.status).toBe(200);

    expect(orderUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
    expect(productUpdateManyMock).toHaveBeenCalledTimes(2);
    expect(productUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod_a", stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      }),
    );
  });

  it("is idempotent: an already-confirmed order is not touched again", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: { id: "pi_1", metadata: { orderId: "order_1" } },
      },
    });
    orderFindUniqueMock.mockResolvedValue({
      id: "order_1",
      status: "CONFIRMED",
      items: [{ productId: "prod_a", quantity: 2 }],
    });

    const res = await POST(makeRequest("{}", "good-sig"));
    expect(res.status).toBe(200);
    expect(orderUpdateMock).not.toHaveBeenCalled();
    expect(productUpdateManyMock).not.toHaveBeenCalled();
  });

  it("cancels a pending order on payment_intent.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: { id: "pi_1", metadata: { orderId: "order_9" } },
      },
    });

    const res = await POST(makeRequest("{}", "good-sig"));
    expect(res.status).toBe(200);
    expect(orderUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_9", status: "PENDING" },
        data: { status: "CANCELLED" },
      }),
    );
  });

  it("acknowledges unhandled event types without acting", async () => {
    constructEventMock.mockReturnValue({
      type: "charge.refunded",
      data: { object: {} },
    });
    const res = await POST(makeRequest("{}", "good-sig"));
    expect(res.status).toBe(200);
    expect(orderUpdateMock).not.toHaveBeenCalled();
    expect(orderUpdateManyMock).not.toHaveBeenCalled();
  });
});
