import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

export const TEST_AUTH_SECRET =
  "playwright-nextauth-secret-minimum-32-chars";

type TestRole = "CUSTOMER" | "FLORIST" | "ADMIN";

export async function addSessionCookie(
  context: BrowserContext,
  baseURL: string,
  role: TestRole,
) {
  const lowerRole = role.toLowerCase();
  const token = await encode({
    secret: TEST_AUTH_SECRET,
    token: {
      id: `e2e-${lowerRole}`,
      email: `${lowerRole}@bloomsense.test`,
      name: `E2E ${role}`,
      role,
    },
  });

  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}
