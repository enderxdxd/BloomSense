import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { aiLimiter, clientKey, enforceRateLimit } from "@/lib/ratelimit";
import { SceneImageRequestSchema, type SceneImageRequest } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(aiLimiter, clientKey(req));
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

  const parsed = SceneImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid scene image request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const prompt = buildScenePrompt(parsed.data);

  try {
    const openai = getOpenAIClient();
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    });

    const item = result.data?.[0];
    const url =
      item?.url ??
      (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);

    if (!url) {
      return NextResponse.json(
        { error: "Image service returned no image data." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        url,
        revisedPrompt:
          (item as { revised_prompt?: string })?.revised_prompt ?? null,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("[profile/scene] image call failed:", err);
    const status = (err as { status?: number }).status;
    const code = (err as { code?: string }).code;
    if (status === 429 || code === "insufficient_quota") {
      return NextResponse.json(
        {
          error:
            "Scene generation is temporarily unavailable due to quota limits.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate venue scene." },
      { status: 502 },
    );
  }
}

function buildScenePrompt(input: SceneImageRequest): string {
  const styleWord = input.arrangementStyle.replace(/-/g, " ");
  const palette = input.colorPalette.slice(0, 4).join(", ");
  const flowers = uniqueWith(
    [input.signatureFlower, ...input.dominantFlowers],
    4,
  ).join(", ");
  const moodPhrase =
    input.vibe && input.vibe.length > 0
      ? `, ${input.vibe.slice(0, 3).join(" and ")} in feeling`
      : "";

  const sceneCore = SCENE_TEMPLATES[input.occasion];
  const replaced = sceneCore
    .replaceAll("{flowers}", flowers)
    .replaceAll("{style}", styleWord)
    .replaceAll("{palette}", palette)
    .replaceAll("{mood}", moodPhrase);

  return [
    replaced,
    "Editorial magazine photography, painterly composition, soft natural light, shallow depth of field, no people, no text, no logos, no watermarks.",
  ].join(" ");
}

const SCENE_TEMPLATES: Record<SceneImageRequest["occasion"], string> = {
  wedding:
    "Wide-angle photograph of a wedding ceremony space: a floral arch and aisle arrangements composed in a {style} style using {flowers}, color palette of {palette}{mood}. Wooden pews or chiavari chairs in soft focus, late-afternoon light filtering through tall windows or open sky.",
  anniversary:
    "Intimate photograph of a candlelit anniversary dinner table set for two, with a low centerpiece in a {style} style featuring {flowers}, color palette of {palette}{mood}. Linen runner, refined dinnerware, two thin tapered candles, warm amber light, golden hour through a nearby window.",
  birthday:
    "Photograph of an elegant birthday tablescape with a celebratory {style} arrangement of {flowers}, color palette of {palette}{mood}. A small layered cake on a cake stand at one end, soft string lights or daylight, polished surfaces, festive but refined.",
  sympathy:
    "Quiet photograph of a memorial alcove with a {style} arrangement of {flowers} on a low stone plinth, color palette of {palette}{mood}. Soft diffused light from a high window, neutral walls, a single open book or framed photograph nearby in deep focus.",
  celebration:
    "Photograph of a refined celebration reception space: a long banquet table with {style} arrangements of {flowers} running its length, color palette of {palette}{mood}. Warm pendant lighting, polished glassware, evening atmosphere, the room set just before guests arrive.",
  "just-because":
    "Photograph of a sunlit living room console or kitchen island holding a {style} arrangement of {flowers}, color palette of {palette}{mood}. Lived-in elegance, books and a ceramic vessel nearby, a window with sheer curtains, morning light.",
};

function uniqueWith<T>(items: T[], max: number): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length === max) break;
  }
  return out;
}
