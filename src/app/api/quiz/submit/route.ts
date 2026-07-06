import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  ARRANGEMENT_STYLES,
  FloralProfileSchema,
  QuizInputSchema,
  type FloralProfile,
  type QuizInput,
} from "@/lib/schema";

export const runtime = "nodejs";

const SESSION_COOKIE = "bloom_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const SYSTEM_PROMPT = `You are BloomSense, an editorial AI floral stylist writing for a high-end magazine. Given a customer's quiz answers, produce a polished "floral personality profile" — short, evocative, never generic.

Respond with VALID JSON matching this exact schema (no extra keys, no markdown, no code fences):

{
  "profileName": string,                  // 1-60 chars, evocative two-word name (e.g. "Modern Romance", "Dusk Ceremony")
  "tagline": string,                      // 8-120 chars, italic subhead (e.g. "A tender contemporary love letter in petals")
  "description": string,                  // 2-3 sentences, 20-500 chars, second-person warm intro
  "narrative": string,                    // 4-6 sentences, 120-900 chars, editorial body copy. Reference the occasion, the recipient, the chosen flowers and palette, the emotional register. Specific, sensory, never saccharine.
  "dominantFlowers": string[],            // 3-5 specific real flowers (e.g. "garden rose", "ranunculus", "anemone"). No generic "flower".
  "signatureFlower": string,              // exactly one entry from dominantFlowers — the hero flower
  "colorPalette": string[],               // 3-5 colors, named ("blush", "ivory") or hex ("#C8A882")
  "moodKeywords": string[],               // 3-5 single-word adjectives (e.g. "romantic", "airy", "tender")
  "recommendedArrangementStyle": string,  // exactly one of: ${ARRANGEMENT_STYLES.join(", ")}
  "stylingNotes": string[]                // exactly 3 actionable styling tips, each 10-220 chars (placement, light, vessel, season, or pairing)
}

Rules:
- signatureFlower MUST appear in dominantFlowers.
- stylingNotes MUST be exactly 3 entries — no more, no less — each a complete actionable sentence.
- Be specific. Reference actual flower species, vessel materials, light qualities, time of day, textures.
- Never use the phrases "as an AI" or "I think". You are the voice of the magazine.`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body is not valid JSON.", 400);
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

  try {
    const profile = await generateProfileWithRetry(inputResult.data);

    const sessionId = req.cookies.get(SESSION_COOKIE)?.value ?? randomUUID();
    await persistProfile(sessionId, inputResult.data, profile);

    const res = NextResponse.json({ profile }, { status: 200 });
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return res;
  } catch (err) {
    if (err instanceof SchemaMismatchError) {
      return NextResponse.json(
        {
          error: "AI response did not match the expected schema after retry.",
          issues: err.issues,
        },
        { status: 502 },
      );
    }
    if (err instanceof AIError) {
      return jsonError(err.message, 502);
    }
    console.error("[quiz/submit] Unexpected error:", err);
    return jsonError("Internal server error.", 500);
  }
}

async function persistProfile(
  sessionId: string,
  input: QuizInput,
  profile: FloralProfile,
): Promise<void> {
  // Anonymous users are modeled as User rows keyed by the session cookie.
  // Phase 9 (NextAuth) will replace this with the authenticated user's id.
  try {
    await prisma.user.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        email: `anon-${sessionId}@anonymous.bloomsense.local`,
      },
    });

    const data = {
      occasion: input.occasion,
      flowerTypes: profile.dominantFlowers,
      palette: profile.colorPalette,
      mood: profile.moodKeywords.join(", "),
      arrangement: profile.recommendedArrangementStyle,
    };

    await prisma.floralProfile.upsert({
      where: { userId: sessionId },
      update: data,
      create: { userId: sessionId, ...data },
    });
  } catch (err) {
    // Persistence must not break the customer-facing flow; log loudly instead.
    console.error("[quiz/submit] Failed to persist FloralProfile:", err);
  }
}

async function generateProfileWithRetry(
  input: QuizInput,
): Promise<FloralProfile> {
  const firstAttempt = await generateProfile(input);
  if (firstAttempt.kind === "ok") return firstAttempt.profile;

  const secondAttempt = await generateProfile(input, {
    correction:
      "Your previous response did not match the schema. Return JSON with EXACTLY these keys: profileName, tagline, description, narrative, dominantFlowers (3-5), signatureFlower (must be one of dominantFlowers), colorPalette (3-5), moodKeywords (3-5), recommendedArrangementStyle, stylingNotes (exactly 3 strings).",
  });
  if (secondAttempt.kind === "ok") return secondAttempt.profile;

  throw new SchemaMismatchError(secondAttempt.issues);
}

interface GenerateOptions {
  correction?: string;
}

type GenerateResult =
  | { kind: "ok"; profile: FloralProfile }
  | { kind: "schema-mismatch"; issues: unknown };

async function generateProfile(
  input: QuizInput,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const openai = getOpenAIClient();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...(options.correction
      ? [{ role: "system" as const, content: options.correction }]
      : []),
    { role: "user" as const, content: JSON.stringify(input) },
  ];

  let raw: string | null = null;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? null;
  } catch (err: unknown) {
    console.error("[quiz/submit] OpenAI call failed:", err);
    const status = (err as { status?: number }).status;
    const code = (err as { code?: string }).code;
    if (status === 429 || code === "insufficient_quota") {
      throw new AIError(
        "The AI service is temporarily unavailable due to quota limits. Please try again later.",
      );
    }
    throw new AIError("Failed to reach the AI service.");
  }


  if (!raw) throw new AIError("AI returned an empty response.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIError("AI returned malformed JSON.");
  }

  const validation = FloralProfileSchema.safeParse(parsed);
  if (!validation.success) {
    return { kind: "schema-mismatch", issues: validation.error.flatten() };
  }
  return { kind: "ok", profile: validation.data };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

class SchemaMismatchError extends Error {
  readonly issues: unknown;
  constructor(issues: unknown) {
    super("AI response failed schema validation after retry.");
    this.name = "SchemaMismatchError";
    this.issues = issues;
  }
}
