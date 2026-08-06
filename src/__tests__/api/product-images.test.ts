import { NextRequest } from "next/server";

const requireRoleMock = jest.fn();
jest.mock("@/lib/auth", () => ({
  requireRole: (...roles: string[]) => requireRoleMock(...roles),
}));

const storageConfiguredMock = jest.fn();
const uploadProductImageMock = jest.fn();
jest.mock("@/lib/storage", () => ({
  isStorageConfigured: () => storageConfiguredMock(),
  uploadProductImage: (...args: unknown[]) =>
    uploadProductImageMock(...args),
}));

import { POST } from "@/app/api/admin/product-images/route";

const FLORIST = {
  ok: true as const,
  session: { user: { id: "florist_1", role: "FLORIST" } },
};

function uploadRequest(file?: File): NextRequest {
  const body = new FormData();
  if (file) body.append("file", file);
  return new NextRequest("http://localhost/api/admin/product-images", {
    method: "POST",
    body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireRoleMock.mockResolvedValue(FLORIST);
  storageConfiguredMock.mockReturnValue(true);
  uploadProductImageMock.mockResolvedValue(
    "https://project.supabase.co/storage/v1/object/public/product-images/image.jpg",
  );
});

describe("POST /api/admin/product-images", () => {
  it("rejects users without an elevated role", async () => {
    requireRoleMock.mockResolvedValue({ ok: false, status: 403 });

    const res = await POST(uploadRequest());

    expect(res.status).toBe(403);
    expect(uploadProductImageMock).not.toHaveBeenCalled();
  });

  it("reports unavailable storage configuration", async () => {
    storageConfiguredMock.mockReturnValue(false);

    const res = await POST(uploadRequest());

    expect(res.status).toBe(503);
  });

  it("requires a file", async () => {
    const res = await POST(uploadRequest());

    expect(res.status).toBe(400);
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["GIF89a"], "flowers.gif", { type: "image/gif" });

    const res = await POST(uploadRequest(file));

    expect(res.status).toBe(415);
    expect(uploadProductImageMock).not.toHaveBeenCalled();
  });

  it("checks that the contents match the declared image type", async () => {
    const file = new File(["not really a png"], "flowers.png", {
      type: "image/png",
    });

    const res = await POST(uploadRequest(file));

    expect(res.status).toBe(415);
    expect(uploadProductImageMock).not.toHaveBeenCalled();
  });

  it("rejects images larger than 4 MB", async () => {
    const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
    bytes.set([0xff, 0xd8, 0xff]);
    const file = new File([bytes], "flowers.jpg", { type: "image/jpeg" });

    const res = await POST(uploadRequest(file));

    expect(res.status).toBe(413);
    expect(uploadProductImageMock).not.toHaveBeenCalled();
  });

  it("uploads a valid image and returns its public URL", async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "flowers.png",
      { type: "image/png" },
    );

    const res = await POST(uploadRequest(file));
    const json = (await res.json()) as { url: string };

    expect(res.status).toBe(201);
    expect(json.url).toContain("product-images");
    expect(uploadProductImageMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/^\d{4}-\d{2}\/[\w-]+\.png$/),
      "image/png",
    );
  });
});
