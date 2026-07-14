import { NextRequest } from "next/server";

const requireRoleMock = jest.fn();
jest.mock("@/lib/auth", () => ({
  requireRole: (...roles: string[]) => requireRoleMock(...roles),
}));

const productFindUniqueMock = jest.fn();
const productFindManyMock = jest.fn();
const productCreateMock = jest.fn();
const productUpdateMock = jest.fn();
const orderFindUniqueMock = jest.fn();
const orderUpdateMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: (...a: unknown[]) => productFindUniqueMock(...a),
      findMany: (...a: unknown[]) => productFindManyMock(...a),
      create: (...a: unknown[]) => productCreateMock(...a),
      update: (...a: unknown[]) => productUpdateMock(...a),
    },
    order: {
      findUnique: (...a: unknown[]) => orderFindUniqueMock(...a),
      update: (...a: unknown[]) => orderUpdateMock(...a),
    },
  },
}));

import { POST as createProduct } from "@/app/api/admin/products/route";
import {
  DELETE as deleteProduct,
  PATCH as patchProduct,
} from "@/app/api/admin/products/[id]/route";
import { PATCH as patchOrder } from "@/app/api/admin/orders/[id]/route";

const FLORIST = {
  ok: true as const,
  session: { user: { id: "florist_1", role: "FLORIST" } },
};
const FORBIDDEN = { ok: false as const, status: 403 as const };

const VALID_PRODUCT = {
  name: "Test Bouquet",
  slug: "test-bouquet",
  description: "A lovely test bouquet with a dozen roses.",
  price: 59.99,
  stock: 10,
  category: "BOUQUET",
  imageUrl: "/images/products/test.jpg",
};

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireRoleMock.mockResolvedValue(FLORIST);
  productFindUniqueMock.mockResolvedValue(null);
  productCreateMock.mockImplementation((args: { data: unknown }) =>
    Promise.resolve({ id: "prod_new", ...(args.data as object) }),
  );
  productUpdateMock.mockImplementation(
    (args: { where: { id: string }; data: object }) =>
      Promise.resolve({
        id: args.where.id,
        ...VALID_PRODUCT,
        ...args.data,
      }),
  );
});

describe("admin products API", () => {
  it("returns 403 for CUSTOMER tokens even past middleware", async () => {
    requireRoleMock.mockResolvedValue(FORBIDDEN);
    const res = await createProduct(
      jsonRequest("/api/admin/products", "POST", VALID_PRODUCT),
    );
    expect(res.status).toBe(403);
    expect(productCreateMock).not.toHaveBeenCalled();
  });

  it("creates a product with valid data", async () => {
    const res = await createProduct(
      jsonRequest("/api/admin/products", "POST", VALID_PRODUCT),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { product: { slug: string } };
    expect(json.product.slug).toBe("test-bouquet");
  });

  it("rejects duplicate slugs with 409", async () => {
    productFindUniqueMock.mockResolvedValue({ id: "prod_existing" });
    const res = await createProduct(
      jsonRequest("/api/admin/products", "POST", VALID_PRODUCT),
    );
    expect(res.status).toBe(409);
  });

  it("rejects invalid product payloads with 400", async () => {
    const res = await createProduct(
      jsonRequest("/api/admin/products", "POST", {
        ...VALID_PRODUCT,
        price: -5,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PATCHes stock inline", async () => {
    productFindUniqueMock.mockResolvedValue({
      id: "prod_1",
      slug: "test-bouquet",
    });
    const res = await patchProduct(
      jsonRequest("/api/admin/products/prod_1", "PATCH", { stock: 3 }),
      { params: { id: "prod_1" } },
    );
    expect(res.status).toBe(200);
    expect(productUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 3 } }),
    );
  });

  it("rejects an empty PATCH", async () => {
    const res = await patchProduct(
      jsonRequest("/api/admin/products/prod_1", "PATCH", {}),
      { params: { id: "prod_1" } },
    );
    expect(res.status).toBe(400);
  });

  it("DELETE soft-deletes by flipping active", async () => {
    productFindUniqueMock.mockResolvedValue({ id: "prod_1" });
    const res = await deleteProduct(
      jsonRequest("/api/admin/products/prod_1", "DELETE"),
      { params: { id: "prod_1" } },
    );
    expect(res.status).toBe(200);
    expect(productUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } }),
    );
  });
});

describe("admin orders API", () => {
  it("allows the legal CONFIRMED → PREPARING transition", async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: "order_1",
      status: "CONFIRMED",
    });
    orderUpdateMock.mockResolvedValue({
      id: "order_1",
      status: "PREPARING",
      total: "89.00",
    });

    const res = await patchOrder(
      jsonRequest("/api/admin/orders/order_1", "PATCH", {
        status: "PREPARING",
      }),
      { params: { id: "order_1" } },
    );
    expect(res.status).toBe(200);
  });

  it("rejects illegal transitions with 422", async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: "order_1",
      status: "PENDING",
    });

    const res = await patchOrder(
      jsonRequest("/api/admin/orders/order_1", "PATCH", { status: "SHIPPED" }),
      { params: { id: "order_1" } },
    );
    expect(res.status).toBe(422);
    expect(orderUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects transitions out of terminal states", async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: "order_1",
      status: "DELIVERED",
    });

    const res = await patchOrder(
      jsonRequest("/api/admin/orders/order_1", "PATCH", {
        status: "PREPARING",
      }),
      { params: { id: "order_1" } },
    );
    expect(res.status).toBe(422);
  });

  it("returns 403 for non-elevated roles", async () => {
    requireRoleMock.mockResolvedValue(FORBIDDEN);
    const res = await patchOrder(
      jsonRequest("/api/admin/orders/order_1", "PATCH", {
        status: "PREPARING",
      }),
      { params: { id: "order_1" } },
    );
    expect(res.status).toBe(403);
  });
});
