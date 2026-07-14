import { NextRequest } from "next/server";

const createMock = jest.fn();

jest.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: createMock } },
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { upsert: jest.fn().mockResolvedValue({}) },
    floralProfile: { upsert: jest.fn().mockResolvedValue({}) },
  },
}));

const FAKE_CATALOG = [
  {
    id: "prod_rose",
    name: "Blush Garden Romance",
    category: "BOUQUET",
    price: 89,
    description: "A romantic hand-tied bouquet of garden roses.",
  },
  {
    id: "prod_peony",
    name: "Peony Cloud",
    category: "ARRANGEMENT",
    price: 120,
    description: "Billowing peonies in a low ceramic compote.",
  },
  {
    id: "prod_stem",
    name: "Single King Protea",
    category: "SINGLE_STEM",
    price: 18,
    description: "A sculptural statement stem.",
  },
];

const FULL_PRODUCTS = FAKE_CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  slug: p.id.replace("prod_", "slug-"),
  description: p.description,
  price: p.price,
  stock: 10,
  category: p.category,
  imageUrl: `/images/products/${p.id}.jpg`,
}));

jest.mock("@/lib/products", () => ({
  listInStockForPrompt: jest.fn(async () => FAKE_CATALOG),
  getProductsByIds: jest.fn(async (ids: string[]) =>
    FULL_PRODUCTS.filter((p) => ids.includes(p.id)),
  ),
}));

import { POST } from "@/app/api/quiz/submit/route";

const VALID_INPUT = {
  occasion: "anniversary",
  recipientRelationship: "spouse",
  budgetUSD: 150,
  vibe: ["romantic"],
  preferredColors: ["blush", "ivory"],
};

const VALID_RECOMMENDATIONS = [
  { productId: "prod_rose", reason: "Garden roses echo your signature bloom." },
  { productId: "prod_peony", reason: "Peonies carry the same soft romance." },
  { productId: "prod_stem", reason: "A sculptural counterpoint for the table." },
];

const VALID_AI_RESPONSE = {
  profileName: "Modern Romance",
  tagline: "A tender contemporary love letter in petals",
  description:
    "A soft, sun-kissed arrangement that feels like the first light of an early garden morning, layered with quiet intimacy.",
  narrative:
    "This arrangement opens with the cool hush of dawn, when garden roses are still folded against the chill and ranunculus discs catch the first thread of light. Anemones punctuate the cluster with quiet drama, their dark centers anchoring the softness around them. The palette stays close to skin and pearl, a deliberate restraint that lets texture do the talking. Choose a low ceramic compote and let the stems lean toward the recipient rather than standing soldier-straight. Bring it close enough to touch.",
  dominantFlowers: ["garden rose", "ranunculus", "anemone", "sweet pea"],
  signatureFlower: "garden rose",
  colorPalette: ["blush", "ivory", "soft peach"],
  moodKeywords: ["romantic", "tender", "luminous"],
  recommendedArrangementStyle: "hand-tied",
  stylingNotes: [
    "Place the arrangement on a low credenza at eye level when seated, so the cascading sweet peas read sculptural.",
    "Use a matte ceramic compote rather than glass — it absorbs morning light and flatters the blush tones.",
    "Refresh the water on day three and recut the stems on a steep angle for another four days of bloom.",
  ],
  recommendations: VALID_RECOMMENDATIONS,
};

function mockCompletion(content: unknown) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
  };
}

let ipCounter = 0;

/**
 * Each request gets a unique x-forwarded-for by default so the module-level
 * in-memory rate limiter never trips across unrelated tests. Tests exercising
 * the limiter itself pass a fixed ip.
 */
function makeRequest(body: unknown, ip?: string): NextRequest {
  ipCounter += 1;
  return new NextRequest("http://localhost/api/quiz/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip ?? `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createMock.mockReset();
  process.env.OPENAI_API_KEY = "test-key";
});

describe("POST /api/quiz/submit", () => {
  it("returns 200 with profile and full recommended products", async () => {
    createMock.mockResolvedValueOnce(mockCompletion(VALID_AI_RESPONSE));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      profile: Record<string, unknown>;
      recommendations: Array<Record<string, unknown>>;
    };

    expect(json.profile.profileName).toBe("Modern Romance");
    expect(json.profile).not.toHaveProperty("recommendations");
    expect(json.recommendations).toHaveLength(3);
    expect(json.recommendations[0]).toMatchObject({
      id: "prod_rose",
      name: "Blush Garden Romance",
      price: 89,
      reason: "Garden roses echo your signature bloom.",
    });
    expect(createMock).toHaveBeenCalledTimes(1);

    // The catalog snapshot must be visible to the model.
    const call = createMock.mock.calls[0][0];
    const catalogMessage = call.messages.find(
      (m: { content: string }) =>
        typeof m.content === "string" && m.content.startsWith("CATALOG"),
    );
    expect(catalogMessage).toBeDefined();
    expect(catalogMessage.content).toContain("prod_rose");
  });

  it("returns 400 when the input fails schema validation", async () => {
    const res = await POST(
      makeRequest({ occasion: "not-a-real-occasion", budgetUSD: -1 }),
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/invalid quiz input/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the AI response fails the schema twice", async () => {
    const badProfile = { profileName: "X", description: "too short" };
    createMock
      .mockResolvedValueOnce(mockCompletion(badProfile))
      .mockResolvedValueOnce(mockCompletion(badProfile));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(502);

    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/schema/i);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a profile whose signatureFlower is not in dominantFlowers", async () => {
    const inconsistent = {
      ...VALID_AI_RESPONSE,
      signatureFlower: "lily-of-the-valley",
    };
    createMock
      .mockResolvedValueOnce(mockCompletion(inconsistent))
      .mockResolvedValueOnce(mockCompletion(inconsistent));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(502);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("rejects recommendations whose productId is not in the injected catalog", async () => {
    const invented = {
      ...VALID_AI_RESPONSE,
      recommendations: [
        ...VALID_RECOMMENDATIONS.slice(0, 2),
        { productId: "prod_hallucinated", reason: "This one does not exist." },
      ],
    };
    createMock
      .mockResolvedValueOnce(mockCompletion(invented))
      .mockResolvedValueOnce(mockCompletion(invented));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(502);

    const json = (await res.json()) as { issues: { recommendations: string } };
    expect(JSON.stringify(json.issues)).toContain("prod_hallucinated");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("recovers when the retry returns valid recommendations", async () => {
    const invented = {
      ...VALID_AI_RESPONSE,
      recommendations: [
        { productId: "prod_fake", reason: "Hallucinated product reference." },
        ...VALID_RECOMMENDATIONS.slice(0, 2),
      ],
    };
    createMock
      .mockResolvedValueOnce(mockCompletion(invented))
      .mockResolvedValueOnce(mockCompletion(VALID_AI_RESPONSE));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("returns 429 with Retry-After on the 6th request in a minute from the same client", async () => {
    const sameIp = "203.0.113.7";
    // Invalid body: the limiter is checked BEFORE validation, so these
    // consume budget without ever reaching OpenAI.
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ bad: "input" }, sameIp));
      expect(res.status).toBe(400);
    }

    const sixth = await POST(makeRequest({ bad: "input" }, sameIp));
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(createMock).not.toHaveBeenCalled();
  });
});
