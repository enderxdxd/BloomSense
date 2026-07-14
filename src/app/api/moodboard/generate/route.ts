import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { aiLimiter, clientKey, enforceRateLimit } from "@/lib/ratelimit";
import { isStorageConfigured, uploadMoodBoard } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const SESSION_COOKIE = "bloom_session";

const MoodBoardRequestSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * Generates (or returns the cached) mood board for the caller's persisted
 * FloralProfile. The prompt is built deterministically from the stored
 * profile, so regenerations stay on-brand.
 */
export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(aiLimiter, clientKey(req));
  if (blocked) return blocked;

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json(
      { error: "Take the quiz first — no floral profile session found." },
      { status: 401 },
    );
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    body = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = MoodBoardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await prisma.floralProfile.findUnique({
    where: { userId: sessionId },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "No floral profile found — take the quiz first." },
      { status: 404 },
    );
  }

  if (profile.moodBoardUrl && !parsed.data.force) {
    return NextResponse.json({
      url: profile.moodBoardUrl,
      cached: true,
      storage: "persistent",
    });
  }

  const prompt = buildMoodBoardPrompt({
    occasion: profile.occasion,
    flowerTypes: profile.flowerTypes,
    palette: profile.palette,
    mood: profile.mood,
    arrangement: profile.arrangement,
  });

  let b64: string;
  try {
    const openai = getOpenAIClient();
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });
    const item = result.data?.[0];
    b64 = item?.b64_json ?? "";
    if (!b64 && item?.url) {
      // Some responses return a URL instead of b64 — fetch it server-side.
      const res = await fetch(item.url);
      b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    }
    if (!b64) throw new Error("no image data in response");
  } catch (err: unknown) {
    console.error("[moodboard] Image generation failed:", err);
    const status = (err as { status?: number }).status;
    return NextResponse.json(
      { error: "Failed to generate the mood board." },
      { status: status === 429 ? 503 : 502 },
    );
  }

  if (isStorageConfigured()) {
    try {
      const url = await uploadMoodBoard(
        Buffer.from(b64, "base64"),
        `${sessionId}.png`,
      );
      await prisma.floralProfile.update({
        where: { userId: sessionId },
        data: { moodBoardUrl: url },
      });
      return NextResponse.json({ url, cached: false, storage: "persistent" });
    } catch (err) {
      console.error("[moodboard] Storage upload failed:", err);
      // Fall through to the ephemeral response — the image still exists.
    }
  }

  return NextResponse.json({
    url: `data:image/png;base64,${b64}`,
    cached: false,
    storage: "ephemeral",
  });
}

interface MoodBoardProfile {
  occasion: string;
  flowerTypes: string[];
  palette: string[];
  mood: string;
  arrangement: string;
}

function buildMoodBoardPrompt(profile: MoodBoardProfile): string {
  return [
    "Editorial floral mood board collage on a soft neutral linen background:",
    `a refined grid of textures and floral vignettes for a ${profile.occasion} occasion,`,
    `featuring ${profile.flowerTypes.slice(0, 4).join(", ")},`,
    `color story of ${profile.palette.slice(0, 4).join(", ")},`,
    `overall mood ${profile.mood},`,
    `arranged in a ${profile.arrangement.replace(/-/g, " ")} style.`,
    "Include petals, ribbon, paper textures and loose stems pinned like a stylist's board.",
    "Soft natural light, magazine quality. No text, no logos, no watermarks, no people.",
  ].join(" ");
}
