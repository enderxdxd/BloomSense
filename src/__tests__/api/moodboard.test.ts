import { NextRequest } from "next/server";

const imagesGenerateMock = jest.fn();
jest.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ images: { generate: imagesGenerateMock } }),
}));

const profileFindUniqueMock = jest.fn();
const profileUpdateMock = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    floralProfile: {
      findUnique: (...a: unknown[]) => profileFindUniqueMock(...a),
      update: (...a: unknown[]) => profileUpdateMock(...a),
    },
  },
}));

const storageConfiguredMock = jest.fn(() => false);
const uploadMock = jest.fn();
jest.mock("@/lib/storage", () => ({
  isStorageConfigured: () => storageConfiguredMock(),
  uploadMoodBoard: (...a: unknown[]) => uploadMock(...a),
}));

import { POST } from "@/app/api/moodboard/generate/route";

const PROFILE = {
  userId: "sess_1",
  occasion: "wedding",
  flowerTypes: ["garden rose", "peony"],
  palette: ["blush", "ivory"],
  mood: "romantic, tender",
  arrangement: "hand-tied",
  moodBoardUrl: null as string | null,
};

let ipCounter = 100;

function makeRequest(opts: { session?: string; body?: unknown } = {}) {
  ipCounter += 1;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": `10.1.0.${ipCounter}`,
  };
  if (opts.session) headers.cookie = `bloom_session=${opts.session}`;
  return new NextRequest("http://localhost/api/moodboard/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  storageConfiguredMock.mockReturnValue(false);
  profileFindUniqueMock.mockResolvedValue({ ...PROFILE });
  imagesGenerateMock.mockResolvedValue({
    data: [{ b64_json: "aGVsbG8=" }],
  });
});

describe("POST /api/moodboard/generate", () => {
  it("returns 401 without a quiz session cookie", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(imagesGenerateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the session has no persisted profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const res = await POST(makeRequest({ session: "sess_1" }));
    expect(res.status).toBe(404);
  });

  it("returns the cached URL without regenerating", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...PROFILE,
      moodBoardUrl: "https://cdn.example/moodboards/sess_1.png",
    });
    const res = await POST(makeRequest({ session: "sess_2" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string; cached: boolean };
    expect(json.cached).toBe(true);
    expect(json.url).toContain("sess_1.png");
    expect(imagesGenerateMock).not.toHaveBeenCalled();
  });

  it("force=true regenerates even when cached", async () => {
    profileFindUniqueMock.mockResolvedValue({
      ...PROFILE,
      moodBoardUrl: "https://cdn.example/moodboards/sess_1.png",
    });
    const res = await POST(
      makeRequest({ session: "sess_3", body: { force: true } }),
    );
    expect(res.status).toBe(200);
    expect(imagesGenerateMock).toHaveBeenCalledTimes(1);
  });

  it("returns an ephemeral data URI when storage is not configured", async () => {
    const res = await POST(makeRequest({ session: "sess_4" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string; storage: string };
    expect(json.storage).toBe("ephemeral");
    expect(json.url.startsWith("data:image/png;base64,")).toBe(true);
    expect(profileUpdateMock).not.toHaveBeenCalled();
  });

  it("uploads and persists when storage is configured", async () => {
    storageConfiguredMock.mockReturnValue(true);
    uploadMock.mockResolvedValue("https://cdn.example/moodboards/sess_1.png");

    const res = await POST(makeRequest({ session: "sess_5" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string; storage: string };
    expect(json.storage).toBe("persistent");
    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { moodBoardUrl: "https://cdn.example/moodboards/sess_1.png" },
      }),
    );
  });

  it("builds the prompt deterministically from the stored profile", async () => {
    await POST(makeRequest({ session: "sess_6" }));
    const prompt = imagesGenerateMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("wedding");
    expect(prompt).toContain("garden rose");
    expect(prompt).toContain("blush");
    expect(prompt).toContain("hand tied");
  });
});
