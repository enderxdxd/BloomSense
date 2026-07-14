import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authLimiter, clientKey, enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(authLimiter, clientKey(req));
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration data.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generic message: do not reveal whether an email is registered.
      return NextResponse.json(
        { error: "Unable to create an account with these details." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("[auth/register] Failed to register user:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
