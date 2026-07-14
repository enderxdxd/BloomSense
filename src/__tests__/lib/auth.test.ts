const getServerSessionMock = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

import { requireRole, requireSession } from "@/lib/auth";

function sessionWithRole(role: string) {
  return {
    user: { id: "user-1", email: "user@example.com", role },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  getServerSessionMock.mockReset();
});

describe("requireSession", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const result = await requireSession();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 401 when the session has no user id", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} });

    const result = await requireSession();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns the session when authenticated", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithRole("CUSTOMER"));

    const result = await requireSession();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.user.id).toBe("user-1");
  });
});

describe("requireRole", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const result = await requireRole("ADMIN");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 403 when the role is insufficient", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithRole("CUSTOMER"));

    const result = await requireRole("FLORIST", "ADMIN");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows a user whose role is in the allowed list", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithRole("FLORIST"));

    const result = await requireRole("FLORIST", "ADMIN");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.user.role).toBe("FLORIST");
  });

  it("allows an ADMIN when ADMIN is required", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithRole("ADMIN"));

    const result = await requireRole("ADMIN");

    expect(result.ok).toBe(true);
  });
});
