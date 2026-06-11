import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { HeroImageRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = HeroImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid hero image request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { signatureFlower, arrangementStyle, colorPalette, vibe } = parsed.data;

  const prompt = buildHeroPrompt({
    signatureFlower,
    arrangementStyle,
    colorPalette,
    vibe: vibe ?? [],
  });

  try {
    const openai = getOpenAIClient();
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1792x1024",
      quality: "standard",
      n: 1,
    });

    const url = result.data?.[0]?.url;
    if (!url) {
      return NextResponse.json(
        { error: "Image service returned no URL." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { url, revisedPrompt: result.data?.[0]?.revised_prompt ?? null },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("[profile/hero] DALL-E call failed:", err);
    const status = (err as { status?: number }).status;
    const code = (err as { code?: string }).code;
    if (status === 429 || code === "insufficient_quota") {
      return NextResponse.json(
        {
          error:
            "Image generation is temporarily unavailable due to quota limits.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate hero image." },
      { status: 502 },
    );
  }
}

interface HeroPromptInput {
  signatureFlower: string;
  arrangementStyle: string;
  colorPalette: string[];
  vibe: string[];
}

function buildHeroPrompt({
  signatureFlower,
  arrangementStyle,
  colorPalette,
  vibe,
}: HeroPromptInput): string {
  const styleWord = arrangementStyle.replace(/-/g, " ");
  const palette = colorPalette.slice(0, 4).join(", ");
  const mood = vibe.length > 0 ? `, ${vibe.slice(0, 3).join(" and ")} in mood` : "";

  return [
    `Editorial floral photograph: a refined, ${styleWord} arrangement with ${signatureFlower} as the focal flower.`,
    `Color palette dominated by ${palette}${mood}.`,
    "Soft natural daylight, shallow depth of field, neutral linen or marble surface, off-white background.",
    "Magazine-quality still life. Painterly composition.",
    "No text, no logos, no watermarks, no people.",
  ].join(" ");
}
