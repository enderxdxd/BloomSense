import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const ELEVATED_ROLES = ["FLORIST", "ADMIN"] as const;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isSessionPath(pathname: string): boolean {
  return (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/api/orders")
  );
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Unauthenticated: API routes get 401 JSON, pages redirect to /login.
  if (!token) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but lacking role for admin surfaces.
  if (isAdminPath(pathname)) {
    const role = token.role as string | undefined;
    if (!role || !ELEVATED_ROLES.includes(role as (typeof ELEVATED_ROLES)[number])) {
      if (isApiPath(pathname)) {
        return NextResponse.json(
          { error: "Insufficient permissions." },
          { status: 403 },
        );
      }
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // isSessionPath routes only require any valid session, already ensured.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/checkout/:path*",
    "/checkout",
    "/orders/:path*",
    "/orders",
    "/api/orders/:path*",
    "/api/orders",
  ],
};
