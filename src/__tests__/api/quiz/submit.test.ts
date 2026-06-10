import { NextRequest } from "next/server";

const createMock = jest.fn();

jest.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: createMock } },
  }),
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
  profileName: "Romantic Dawn",
  description:
    "A soft, sun-kissed arrangement that feels like the first light of an early garden morning, layered with quiet intimacy.",
  dominantFlowers: ["garden rose", "ranunculus", "spray rose"],
  colorPalette: ["blush", "ivory", "soft peach"],
  moodKeywords: ["romantic", "tender", "luminous"],
  recommendedArrangementStyle: "hand-tied",
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
});
