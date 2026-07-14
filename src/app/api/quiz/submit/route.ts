import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getProductsByIds, listInStockForPrompt } from "@/lib/products";
import { aiLimiter, clientKey, enforceRateLimit } from "@/lib/ratelimit";
import {
  AIQuizResponseSchema,
  ARRANGEMENT_STYLES,
  QuizInputSchema,
  type AIQuizResponse,
  type FloralProfile,
  type QuizInput,
  type RecommendedProduct,
} from "@/lib/schema";

export const runtime = "nodejs";

const SESSION_COOKIE = "bloom_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const SYSTEM_PROMPT = `You are BloomSense, an editorial AI floral stylist writing for a high-end magazine. Given a customer's quiz answers, produce a polished "floral personality profile" — short, evocative, never generic — and recommend products from the shop catalog provided below.

Respond with VALID JSON matching this exact schema (no extra keys, no markdown, no code fences):

{
  "profileName": string,                  // 1-60 chars, evocative two-word name (e.g. "Modern Romance", "Dusk Ceremony")
  "tagline": string,                      // 8-120 chars, italic subhead
  "description": string,                  // 2-3 sentences, 20-500 chars, second-person warm intro
  "narrative": string,                    // 4-6 sentences, 120-900 chars, editorial body copy referencing the occasion, recipient, flowers, palette
  "dominantFlowers": string[],            // 3-5 specific real flowers. No generic "flower".
  "signatureFlower": string,              // exactly one entry from dominantFlowers
  "colorPalette": string[],               // 3-5 colors, named or hex
  "moodKeywords": string[],               // 3-5 single-word adjectives
  "recommendedArrangementStyle": string,  // exactly one of: ${ARRANGEMENT_STYLES.join(", ")}
  "stylingNotes": string[],               // exactly 3 actionable styling tips, each 10-220 chars
  "recommendations": [                    // 3-5 items chosen ONLY from the CATALOG below
    { "productId": string, "reason": string } // reason: one warm sentence (8-220 chars) tying the product to THIS profile
  ]
}

Rules:
- signatureFlower MUST appear in dominantFlowers.
- stylingNotes MUST be exactly 3 entries.
- recommendations MUST use productId values copied verbatim from the CATALOG. Never invent IDs. Prefer products whose style, category and price fit the customer's occasion and budget.
- Be specific and sensory. Never use "as an AI" or "I think".`;

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(aiLimiter, clientKey(req));
  if (blocked) return blocked;

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
    const catalog = await listInStockForPrompt();
    const aiResponse = await generateWithRetry(inputResult.data, catalog);
    const { recommendations: recommended, ...profile } = aiResponse;

    // IDs were validated against the snapshot; re-fetch full rows (and
    // silently drop anything deactivated between snapshot and now).
    const products = await getProductsByIds(
      recommended.map((r) => r.productId),
    );
    const productById = new Map(products.map((p) => [p.id, p]));
    const recommendations: RecommendedProduct[] = recommended.flatMap((r) => {
      const product = productById.get(r.productId);
      if (!product) return [];
      return [
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          stock: product.stock,
          reason: r.reason,
        },
      ];
    });

    const sessionId = req.cookies.get(SESSION_COOKIE)?.value ?? randomUUID();
    await persistProfile(sessionId, inputResult.data, profile);

    const res = NextResponse.json({ profile, recommendations }, { status: 200 });
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

type CatalogSnapshot = Awaited<ReturnType<typeof listInStockForPrompt>>;

async function persistProfile(
  sessionId: string,
  input: QuizInput,
  profile: FloralProfile,
): Promise<void> {
  // Anonymous users are modeled as User rows keyed by the session cookie.
  // Authenticated flows attach the profile to the real user id instead.
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

async function generateWithRetry(
  input: QuizInput,
  catalog: CatalogSnapshot,
): Promise<AIQuizResponse> {
  const firstAttempt = await generate(input, catalog);
  if (firstAttempt.kind === "ok") return firstAttempt.response;

  const secondAttempt = await generate(input, catalog, {
    correction:
      "Your previous response was rejected. Return JSON with EXACTLY these keys: profileName, tagline, description, narrative, dominantFlowers (3-5), signatureFlower (one of dominantFlowers), colorPalette (3-5), moodKeywords (3-5), recommendedArrangementStyle, stylingNotes (exactly 3), recommendations (3-5 objects with productId copied VERBATIM from the CATALOG list and a reason sentence).",
  });
  if (secondAttempt.kind === "ok") return secondAttempt.response;

  throw new SchemaMismatchError(secondAttempt.issues);
}

interface GenerateOptions {
  correction?: string;
}

type GenerateResult =
  | { kind: "ok"; response: AIQuizResponse }
  | { kind: "schema-mismatch"; issues: unknown };

async function generate(
  input: QuizInput,
  catalog: CatalogSnapshot,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const openai = getOpenAIClient();

  const catalogPrompt = `CATALOG (the ONLY products you may recommend):\n${JSON.stringify(
    catalog.map((p) => ({
      productId: p.id,
      name: p.name,
      category: p.category,
      priceUSD: p.price,
      about: p.description.slice(0, 90),
    })),
  )}`;

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "system" as const, content: catalogPrompt },
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

  const validation = AIQuizResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return { kind: "schema-mismatch", issues: validation.error.flatten() };
  }

  // RAG guardrail: every recommended ID must exist in the injected snapshot.
  const validIds = new Set(catalog.map((p) => p.id));
  const invented = validation.data.recommendations.filter(
    (r) => !validIds.has(r.productId),
  );
  if (invented.length > 0) {
    return {
      kind: "schema-mismatch",
      issues: {
        recommendations: `Unknown productId(s): ${invented
          .map((r) => r.productId)
          .join(", ")}`,
      },
    };
  }

  return { kind: "ok", response: validation.data };
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
