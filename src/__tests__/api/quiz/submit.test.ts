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

import { POST } from "@/app/api/quiz/submit/route";

const VALID_INPUT = {
  occasion: "anniversary",
  recipientRelationship: "spouse",
  budgetUSD: 150,
  vibe: ["romantic"],
  preferredColors: ["blush", "ivory"],
};

const VALID_PROFILE = {
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
};

function mockCompletion(content: unknown) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quiz/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createMock.mockReset();
  process.env.OPENAI_API_KEY = "test-key";
});

describe("POST /api/quiz/submit", () => {
  it("returns 200 with the profile when input and AI response are valid", async () => {
    createMock.mockResolvedValueOnce(mockCompletion(VALID_PROFILE));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(200);

    const json = (await res.json()) as { profile: typeof VALID_PROFILE };
    expect(json.profile).toEqual(VALID_PROFILE);
    expect(createMock).toHaveBeenCalledTimes(1);
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
      ...VALID_PROFILE,
      signatureFlower: "lily-of-the-valley",
    };
    createMock
      .mockResolvedValueOnce(mockCompletion(inconsistent))
      .mockResolvedValueOnce(mockCompletion(inconsistent));

    const res = await POST(makeRequest(VALID_INPUT));
    expect(res.status).toBe(502);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
