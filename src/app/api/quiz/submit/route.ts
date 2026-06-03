import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import {
  ARRANGEMENT_STYLES,
  FloralProfileSchema,
  QuizInputSchema,
} from "@/lib/schema";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are BloomSense, an AI floral stylist. Given a customer's quiz answers about a floral occasion, produce a structured "floral personality profile" used to drive product recommendations and a mood-board preview.

Respond with valid JSON that matches this exact schema (no extra keys, no markdown):

{
  "profileName": string,               // short evocative name, 1-60 chars (e.g. "Romantic Dawn")
  "description": string,               // 2-3 sentences, 20-500 chars, second-person, warm
  "dominantFlowers": string[],         // 3-5 common flower names (e.g. "garden rose", "ranunculus")
  "colorPalette": string[],            // 3-5 named or hex colors (e.g. "blush", "#C8A882")
  "moodKeywords": string[],            // 3-5 single-word adjectives (e.g. "romantic", "airy")
  "recommendedArrangementStyle": string // exactly one of: ${ARRANGEMENT_STYLES.join(", ")}
}

Be thoughtful: align the palette and flowers to the stated occasion, vibe, and any color preferences. Avoid clichés where possible.`;

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

  const inputResult = QuizInputSchema.safeParse(body);
  if (!inputResult.success) {
    return NextResponse.json(
      {
        error: "Invalid quiz input.",
        issues: inputResult.error.flatten(),
      },
      { status: 400 },
    );
  }
  const quizInput = inputResult.data;

  let raw: string | null = null;
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(quizInput) },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[quiz/submit] OpenAI call failed:", err);
    return NextResponse.json(
      { error: "Failed to generate floral profile." },
      { status: 502 },
    );
  }

  if (!raw) {
    return NextResponse.json(
      { error: "AI returned an empty response." },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "AI returned malformed JSON." },
      { status: 502 },
    );
  }

  const profileResult = FloralProfileSchema.safeParse(parsed);
  if (!profileResult.success) {
    console.error(
      "[quiz/submit] AI response failed schema validation:",
      profileResult.error.flatten(),
    );
    return NextResponse.json(
      {
        error: "AI response did not match the expected schema.",
        issues: profileResult.error.flatten(),
      },
      { status: 502 },
    );
  }

  return NextResponse.json(profileResult.data, { status: 200 });
}
