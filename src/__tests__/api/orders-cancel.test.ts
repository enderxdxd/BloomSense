import { NextRequest } from "next/server";

const requireSessionMock: jest.Mock = jest.fn();
jest.mock("@/lib/auth", () => ({
  requireSession: () => requireSessionMock(),
}));

const stripeConfiguredMock: jest.Mock = jest.fn();
const refundCreateMock: jest.Mock = jest.fn();
const piCancelMock: jest.Mock = jest.fn();
jest.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfiguredMock(),
  getStripe: () => ({
    refunds: { create: refundCreateMock },
    paymentIntents: { cancel: piCancelMock },
  }),
}));

const orderFindUniqueMock: jest.Mock = jest.fn();
const txOrderFindUniqueMock: jest.Mock = jest.fn();
const txOrderUpdateMock: jest.Mock = jest.fn();
const txProductUpdateMock: jest.Mock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: (...a: unknown[]) => orderFindUniqueMock(...a) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        order: {
          findUnique: (...a: unknown[]) => txOrderFindUniqueMock(...a),
          update: (...a: unknown[]) => txOrderUpdateMock(...a),
        },
        product: {
          update: (...a: unknown[]) => txProductUpdateMock(...a),
        },
      }),
  },
}));

import { POST } from "@/app/api/orders/[id]/cancel/route";

const OWNER = {
  ok: true as const,
  session: { user: { id: "user_1", role: "CUSTOMER" } },
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/orders/order_1/cancel", {
    method: "POST",
  });
}

const CTX = { params: { id: "order_1" } };

function setOrder(status: string, opts: { owner?: string } = {}) {
  orderFindUniqueMock.mockResolvedValue({
    id: "order_1",
    userId: opts.owner ?? "user_1",
    status,
    stripePaymentId: "pi_123",
  });
  txOrderFindUniqueMock.mockResolvedValue({
    id: "order_1",
    status,
    items: [
      { productId: "prod_a", quantity: 2 },
      { productId: "prod_b", quantity: 1 },
    ],
  });
  txOrderUpdateMock.mockImplementation(
    (args: { data: { status: string } }) => ({
      id: "order_1",
      status: args.data.status,
      items: [],
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  requireSessionMock.mockResolvedValue(OWNER);
  stripeConfiguredMock.mockReturnValue(true);
  refundCreateMock.mockResolvedValue({ id: "re_123" });
  piCancelMock.mockResolvedValue({});
  txProductUpdateMock.mockResolvedValue({});
});

describe("POST /api/orders/[id]/cancel", () => {
  it("returns 401 without a session", async () => {
    requireSessionMock.mockResolvedValue({ ok: false, status: 401 });
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(401);
  });

  it("returns 403 for another user's order", async () => {
    setOrder("PENDING", { owner: "someone_else" });
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(403);
    expect(refundCreateMock).not.toHaveBeenCalled();
  });

  it("cancels a PENDING order without any refund and without restocking", async () => {
    setOrder("PENDING");
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      order: { status: string };
      refunded: boolean;
    };
    expect(json.order.status).toBe("CANCELLED");
    expect(json.refunded).toBe(false);
    expect(piCancelMock).toHaveBeenCalledWith("pi_123");
    expect(refundCreateMock).not.toHaveBeenCalled();
    // PENDING never decremented stock, so nothing to restore.
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it("refunds a CONFIRMED order and restores stock", async () => {
    setOrder("CONFIRMED");
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      order: { status: string };
      refunded: boolean;
      refundId: string;
    };
    expect(json.order.status).toBe("REFUNDED");
    expect(json.refunded).toBe(true);
    expect(json.refundId).toBe("re_123");
    expect(refundCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_123" }),
    );
    expect(txProductUpdateMock).toHaveBeenCalledTimes(2);
    expect(txProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod_a" },
        data: { stock: { increment: 2 } },
      }),
    );
  });

  it("rejects self-service cancellation after shipping", async () => {
    setOrder("SHIPPED");
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(422);
    expect(refundCreateMock).not.toHaveBeenCalled();
  });

  it("returns 503 for a paid order when Stripe is not configured", async () => {
    stripeConfiguredMock.mockReturnValue(false);
    setOrder("CONFIRMED");
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(503);
    expect(txOrderUpdateMock).not.toHaveBeenCalled();
  });

  it("is a no-op with a clear message when already cancelled", async () => {
    setOrder("CANCELLED");
    const res = await POST(makeRequest(), CTX);
    expect(res.status).toBe(422);
  });
});
