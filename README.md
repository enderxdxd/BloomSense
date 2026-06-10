# BloomSense

**AI-powered floral experience platform.** Customers take a guided 4-step
quiz about their occasion (wedding, anniversary, birthday, just because) and
GPT-4o-mini generates a structured *floral personality profile* that drives
product recommendations and a visual mood board preview.

---

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom `bloom-*` palette + Cormorant Garamond / Inter via `next/font`
- **AI:** OpenAI GPT-4o-mini via the official `openai` SDK (JSON mode, single-retry)
- **Validation:** [Zod](https://zod.dev/) for both quiz input and AI responses
- **Animation:** [Framer Motion](https://www.framer.com/motion/) for step transitions and result reveal
- **Icons:** [Lucide](https://lucide.dev/) for the occasion selector
- **Tests:** Jest + `next/jest` for the API route

Planned for later phases: Supabase + Prisma (DB), NextAuth.js (auth), Stripe (payments).

---

## Project Structure

```
src/
  app/
    api/quiz/submit/route.ts     POST endpoint: quiz → GPT-4o-mini → floral profile (with retry)
    layout.tsx                   Root layout, fonts, metadata
    globals.css                  Tailwind directives + base typography
    page.tsx                     Thin wrapper rendering <QuizForm /> + <FloralProfileCard />
  components/
    QuizForm.tsx                 4-step quiz with state, validation, animated transitions
    FloralProfileCard.tsx        Result card with palette swatches, flower chips, mood pills
    FloralProfileSkeleton.tsx    Pulsing placeholder shown during AI generation
    ErrorState.tsx               Error banner with retry button
  lib/
    openai.ts                    Lazy OpenAI client singleton
    schema.ts                    Zod schemas (QuizInput, FloralProfile) + inferred types
  __tests__/
    api/quiz/submit.test.ts      Unit tests for the API route (OpenAI mocked)
```

---

## Local Setup

### Prerequisites
- **Node.js 20+**
- **npm 9+**
- An **OpenAI API key** with access to `gpt-4o-mini`

### 1. Install
```bash
git clone https://github.com/your-org/BloomSense.git
cd BloomSense
npm install
```

### 2. Configure environment
Copy the example file and fill in your key:
```bash
cp .env.example .env.local
```

```
OPENAI_API_KEY=sk-...
```

`.env.local` is git-ignored — never commit it.

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), step through the quiz,
and click **Generate my profile**. The AI response is streamed back as a
structured profile card with palette, flowers, mood, and arrangement.

---

## Available Scripts

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start Next.js dev server on port 3000     |
| `npm run build` | Production build                          |
| `npm start`     | Run the production build                  |
| `npm run lint`  | Run ESLint (Next.js core-web-vitals)      |
| `npm test`      | Run Jest unit tests                       |

---

## Architecture Overview

```
┌──────────────┐    POST /api/quiz/submit    ┌────────────────────┐
│  QuizForm    │ ──────────────────────────▶ │  route.ts          │
│ (4 steps)    │                              │                    │
│              │                              │ 1. Zod validates   │
│              │                              │    QuizInput       │
└──────────────┘                              │ 2. Calls GPT-4o-mini│
        ▲                                     │    (JSON mode)     │
        │ FloralProfile                       │ 3. Zod validates   │
        │                                     │    response;       │
┌──────────────┐                              │    retries once on │
│ ProfileCard  │ ◀─── { profile }  ──────────│    schema mismatch │
└──────────────┘                              │ 4. Returns profile │
                                              └────────────────────┘
```

**Status codes:**
- `200` — profile returned
- `400` — invalid quiz input (Zod issues in `issues` field)
- `502` — AI unreachable, empty/malformed response, or schema mismatch after retry
- `500` — unexpected server error

---

## Brand Colors (Tailwind)

| Token            | Hex        | Use                       |
| ---------------- | ---------- | ------------------------- |
| `bloom-primary`  | `#6D2E46`  | Deep berry — primary CTA  |
| `bloom-rose`     | `#A26769`  | Dusty rose — secondary    |
| `bloom-sage`     | `#7A9E7E`  | Sage green — accents      |
| `bloom-gold`     | `#C8A882`  | Warm gold — highlights    |
| `bloom-cream`    | `#F9F5F0`  | Off-white — backgrounds   |

---

## Contributing

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`).
- Keep commits small and focused — one logical change each.
- Never commit broken builds.
- All external input (forms, API bodies, LLM responses) must be validated with Zod.
- TypeScript strict mode — never `any`.
- Server components by default; `"use client"` only when interactive state is needed.

---

## Phase Roadmap

The implementation plan (Phases 0–7) lives in [CLAUDE.md](./CLAUDE.md). The
vertical slice — quiz → API → AI → profile on screen — is the current focus.
