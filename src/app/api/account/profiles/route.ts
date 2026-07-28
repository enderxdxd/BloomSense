import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** The signed-in user's saved quiz profiles (max 3 enforced at save time). */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: auth.status },
    );
  }

  const profiles = await prisma.floralProfile.findMany({
    where: { userId: auth.session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      occasion: true,
      flowerTypes: true,
      palette: true,
      arrangement: true,
      moodBoardUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    profiles: profiles.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    limit: 3,
  });
}
