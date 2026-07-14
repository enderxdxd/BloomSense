import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { authLimiter, clientKey, enforceRateLimit } from "@/lib/ratelimit";

const handler = NextAuth(authOptions);

type RouteContext = { params: { nextauth: string[] } };

export { handler as GET };

export async function POST(req: NextRequest, context: RouteContext) {
  // Brute-force protection: only the credentials sign-in callback is
  // limited; other NextAuth POSTs (signout, csrf) pass through.
  if (req.nextUrl.pathname.endsWith("/callback/credentials")) {
    const blocked = await enforceRateLimit(authLimiter, clientKey(req));
    if (blocked) return blocked;
  }
  return handler(req, context);
}
