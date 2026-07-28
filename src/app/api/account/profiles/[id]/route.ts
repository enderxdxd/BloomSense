import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

/** Deleting a saved quiz frees one of the account's 3 slots. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: auth.status },
    );
  }

  const profile = await prisma.floralProfile.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (profile.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.floralProfile.delete({ where: { id: params.id } });

  const remaining = await prisma.floralProfile.count({
    where: { userId: auth.session.user.id },
  });
  return NextResponse.json({ deleted: true, savedCount: remaining, limit: 3 });
}
