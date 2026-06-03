# BloomSense

**AI-powered floral experience platform.** Customers take a guided quiz about
their occasion (wedding, anniversary, birthday, etc.), and GPT-4o-mini
generates a structured *floral personality profile* that drives product
recommendations and a visual mood board preview.

---

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) with the App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with a custom BloomSense color palette
- **AI:** OpenAI GPT-4o-mini via the official `openai` SDK
- **Validation:** [Zod](https://zod.dev/) for both user input and AI responses
- **Animation:** Framer Motion

Planned for later phases: Supabase + Prisma (database), NextAuth.js (auth),
Stripe (payments).

---

## Project Structure

```
src/
  app/
    api/quiz/submit/route.ts   POST endpoint: quiz → GPT-4o → floral profile
    page.tsx                   Main quiz page
    layout.tsx                 Root layout
  components/                  React components (QuizForm, FloralProfileCard, …)
  lib/                         Shared utilities (openai client, Zod schemas)
```

---

## Local Setup

### Prerequisites

- **Node.js 18.17+** (Next.js 14 requirement)
- **npm 9+** (or pnpm / yarn — examples below use npm)
- An **OpenAI API key** with access to `gpt-4o-mini`

### 1. Clone and install

```bash
git clone https://github.com/your-org/BloomSense.git
cd BloomSense
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your secrets:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
OPENAI_API_KEY=sk-...
```

`.env.local` is git-ignored — never commit it.

### 3. Run the dev server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Start Next.js in dev mode on port 3000    |
| `npm run build`  | Production build                          |
| `npm run lint`   | Run ESLint                                |
| `npm test`       | Run Jest tests                            |

---

## Brand Colors

Defined in `tailwind.config.ts`:

| Token            | Hex        | Use                       |
| ---------------- | ---------- | ------------------------- |
| `bloom-primary`  | `#6D2E46`  | Deep berry — primary CTA  |
| `bloom-rose`     | `#A26769`  | Dusty rose — accents      |
| `bloom-sage`     | `#7A9E7E`  | Sage green — secondary    |
| `bloom-gold`     | `#C8A882`  | Warm gold — highlights    |
| `bloom-cream`    | `#F9F5F0`  | Off-white — backgrounds   |

---

## Current Phase

We are building the **vertical slice**: quiz form → API route → GPT-4o-mini →
floral profile rendered on screen. This validates the AI integration end-to-end
before scaling out the full product surface.

---

## Contributing

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`).
- Keep commits small and focused — one logical change each.
- Never commit broken builds.
- All external input (forms, API bodies, LLM responses) must be validated with
  Zod.
