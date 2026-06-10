import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import {
  ARRANGEMENT_STYLES,
  FloralProfileSchema,
  QuizInputSchema,
  type FloralProfile,
  type QuizInput,
} from "@/lib/schema";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are BloomSense, an AI floral stylist. Given a customer's quiz answers about a floral occasion, produce a structured "floral personality profile" used to drive product recommendations and a mood-board preview.

Respond with valid JSON that matches this exact schema (no extra keys, no markdown):

{
  "profileName": string,               // short evocative name, 1-60 chars (e.g. "Romantic Dawn")
  "description": string,               // 2-3 sentences, 20-500 chars, second-person, warm
  "dominantFlowers": string[],         // 3-5 specific real flowers (e.g. "garden rose", "ranunculus")
  "colorPalette": string[],            // 3-5 named or hex colors (e.g. "blush", "#C8A882")
  "moodKeywords": string[],            // 3-5 single-word adjectives (e.g. "romantic", "airy")
  "recommendedArrangementStyle": string // exactly one of: ${ARRANGEMENT_STYLES.join(", ")}
}

Be thoughtful: align the palette and flowers to the stated occasion, vibe, and any color preferences. Pick specific real flowers (no generic "flowers"). Avoid clichés where possible.`;

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
    return NextResponse.json({ profile }, { status: 200 });
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

async function generateProfileWithRetry(
  input: QuizInput,
): Promise<FloralProfile> {
  const firstAttempt = await generateProfile(input);
  if (firstAttempt.kind === "ok") return firstAttempt.profile;

  const secondAttempt = await generateProfile(input, {
    correction:
      "Your previous response did not match the schema. Return JSON with EXACTLY these keys: profileName, description, dominantFlowers (3-5 strings), colorPalette (3-5 strings), moodKeywords (3-5 strings), recommendedArrangementStyle.",
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
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[quiz/submit] OpenAI call failed:", err);
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
