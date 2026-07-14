# BloomSense — AI-Powered Floral Experience Platform (Master Plan v2)

## Project Vision
BloomSense is a production-grade, fully interactive floral e-commerce platform. Customers experience an immersive 3D landing page, take an animated multi-step quiz, receive AI-generated floral profiles with visual mood boards, browse a catalog matched to their profile, and check out with Stripe. Florists/admins manage inventory and orders through a protected dashboard. Every endpoint is secured with authentication, role-based access control, validation, and rate limiting.

## Commands
- `npm run dev` — dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Jest unit tests
- `npm run test:e2e` — Playwright E2E tests
- `npx prisma studio` — visual DB browser
- `npx prisma migrate dev` — create/apply migration

## Complete Tech Stack

### Frontend & Visual Experience
- **Next.js 14** (App Router, RSC) + **TypeScript strict**
- **Tailwind CSS** with custom bloom-* palette
- **React Three Fiber + Drei** — 3D scenes (hero, bouquet preview, particles)
- **GSAP + ScrollTrigger** — scroll-driven storytelling sections
- **Lenis** — smooth inertial scrolling
- **Framer Motion** — UI micro-interactions and page transitions
- **Zustand** — cart and client state
- **lucide-react** — icons

### Backend & Data
- **Next.js API Routes** — serverless handlers
- **Prisma ORM** + **Supabase PostgreSQL**
- **Supabase Storage** — mood board images
- **NextAuth.js** — authentication, JWT sessions, RBAC
- **Zod** — runtime validation on every external input
- **Stripe** — PaymentIntent + webhooks
- **Upstash Redis** — rate limiting

### AI Layer
- **OpenAI GPT-4o-mini** — floral profile generation (JSON mode)
- **Replicate (Flux)** — mood board image generation
- RAG-style prompting: catalog injected into prompt so AI recommends only in-stock products

### DevOps
- **GitHub Actions** — lint, test, build pipeline
- **Vercel** — deployment with preview URLs
- **Playwright** — E2E testing

## Architecture
```
src/
  app/
    (marketing)/
      page.tsx                    — 3D hero landing + scroll story
    (shop)/
      quiz/page.tsx               — multi-step animated quiz
      catalog/page.tsx            — product catalog with filters
      product/[slug]/page.tsx     — product detail
      cart/page.tsx               — cart
      checkout/page.tsx           — Stripe checkout
      orders/page.tsx             — customer order history
    admin/
      layout.tsx                  — protected admin shell
      page.tsx                    — dashboard analytics
      inventory/page.tsx          — product/stock CRUD
      orders/page.tsx             — order pipeline management
    api/
      quiz/submit/route.ts        — AI profile generation
      moodboard/generate/route.ts — Replicate image gen
      products/route.ts           — catalog (public GET)
      orders/route.ts             — create order (session)
      orders/[id]/route.ts        — order detail (owner)
      admin/products/route.ts     — product CRUD (role)
      admin/orders/[id]/route.ts  — status updates (role)
      webhooks/stripe/route.ts    — payment confirmation
      auth/[...nextauth]/route.ts — NextAuth
  components/
    three/                        — R3F scenes (Hero3D, PetalField, BouquetViewer)
    quiz/                         — QuizForm, steps, OccasionSelector
    shop/                         — ProductCard, CartDrawer, CheckoutForm
    admin/                        — InventoryTable, OrderPipeline, StatCards
    ui/                           — shared primitives
  lib/
    openai.ts                     — OpenAI client
    replicate.ts                  — Replicate client
    prisma.ts                     — Prisma singleton
    stripe.ts                     — Stripe client
    auth.ts                       — NextAuth config + helpers
    ratelimit.ts                  — Upstash limiter
    schema.ts                     — all Zod schemas
  middleware.ts                   — route protection (admin, session)
prisma/
  schema.prisma                   — data model
  seed.ts                         — product seed data
```

## Security Requirements (non-negotiable)
1. **Authentication:** NextAuth with JWT sessions. Passwords (if credentials provider) hashed with bcrypt.
2. **RBAC:** Roles CUSTOMER / FLORIST / ADMIN enforced in middleware AND in each admin API route (defense in depth — never trust middleware alone).
3. **Validation:** Every API route validates its body/params with Zod before any logic. LLM responses validated before persistence.
4. **Rate limiting:** AI endpoints (quiz, moodboard) limited to 5 req/min per user via Upstash. Auth endpoints limited against brute force.
5. **Stripe webhooks:** signature verified with `stripe.webhooks.constructEvent` — reject anything unsigned.
6. **Secrets:** server-only env vars never exposed; only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is client-side. Claude Code must never read or print `.env.local`.
7. **Headers:** CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff via next.config headers.
8. **SQL injection:** covered by Prisma parametrization — never use raw queries with user input.
9. **Ownership checks:** `/api/orders/[id]` verifies session.user.id matches order.userId.

## Design Direction (3D & Visual)
- **Signature element:** the landing hero — a 3D field of drifting flower petals (R3F + custom shader or instanced meshes) that reacts subtly to cursor movement and parts as you scroll, revealing the headline. This is the one memorable thing; everything else stays disciplined.
- **Scroll story:** GSAP ScrollTrigger pinned sections telling the Marco story (problem → solution → how it works) with parallax florals.
- **Typography:** serif display (e.g., Fraunces or Playfair Display via next/font) + clean sans body (Inter). Type is part of the brand, not decoration.
- **Palette:** bloom-primary #6D2E46, bloom-rose #A26769, bloom-sage #7A9E7E, bloom-gold #C8A882, bloom-cream #F9F5F0, deep bg #1E1225.
- **Motion discipline:** one orchestrated hero moment; micro-interactions elsewhere. ALWAYS respect `prefers-reduced-motion` — static fallbacks required.
- **Mobile:** 3D scenes get lightweight fallbacks (static render or reduced particle count) below 768px.

## Git Conventions
- Conventional Commits: `feat:` `fix:` `chore:` `style:` `refactor:` `test:` `docs:` `perf:` `security:`
- Imperative mood, ≤72 chars, one logical unit per commit
- Feature branches per phase: `feat/phase-8-database`, merged to main when checkpoint passes
- Never commit broken builds or secrets

---

# IMPLEMENTATION PLAN — Full Platform (Phases 8–16)

Phases 0–7 (vertical slice: quiz → GPT → profile on screen) are complete. This plan builds the production platform on top. Execute ONE sub-phase per request unless asked otherwise. Verify each checkpoint before advancing.

---

## Phase 8 — Database Layer (Prisma + Supabase)

### 8A — Prisma + Supabase Setup
**Commit:** `chore: add Prisma with Supabase PostgreSQL connection`
1. Create a Supabase project (user does this manually; ask for the connection string)
2. `npm install prisma @prisma/client && npx prisma init`
3. Configure `DATABASE_URL` and `DIRECT_URL` in `.env.local`, document in `.env.example`
4. Create `src/lib/prisma.ts` singleton (global caching pattern for dev)

**Checkpoint:** `npx prisma db pull` connects without error.

### 8B — Data Model
**Commit:** `feat: define Prisma schema with User, FloralProfile, Product, Order models`
Define in `prisma/schema.prisma`:
- `User` (id cuid, email unique, name, passwordHash?, role enum default CUSTOMER, relations)
- `FloralProfile` (1:1 User, occasion, flowerTypes String[], palette String[], mood, arrangement, moodBoardUrl?, createdAt)
- `Product` (id, name, slug unique, description, price Decimal, stock Int, category enum, imageUrl, active Boolean)
- `Order` (id, userId FK, status enum PENDING/CONFIRMED/PREPARING/SHIPPED/DELIVERED/CANCELLED, total Decimal, stripePaymentId?, createdAt)
- `OrderItem` (orderId FK, productId FK, quantity, unitPrice Decimal)
- Enums: `Role`, `OrderStatus`, `Category`

**Checkpoint:** `npx prisma migrate dev --name init` succeeds; tables visible in Supabase.

### 8C — Seed Data
**Commit:** `feat: add product seed data with 20 realistic floral products`
Create `prisma/seed.ts` with ~20 products across categories (bouquets, arrangements, single stems, wedding packages) with realistic names, prices, stock, and descriptions. Configure `prisma.seed` in package.json.

**Checkpoint:** `npx prisma db seed` populates; `npx prisma studio` shows products.

### 8D — Persist Quiz Profiles
**Commit:** `feat: persist floral profiles to database on quiz submission`
Update `/api/quiz/submit` to upsert the FloralProfile for the user (or anonymous session ID for now) after Zod validation.

**Checkpoint:** Submitting the quiz creates a row in FloralProfile.

---

## Phase 9 — Authentication & Security Foundation

### 9A — NextAuth Setup
**Commit:** `feat: add NextAuth with credentials provider and Prisma adapter`
1. `npm install next-auth @auth/prisma-adapter bcryptjs`
2. Create `src/lib/auth.ts` with NextAuth config: credentials provider (email+password, bcrypt compare), JWT strategy, role in token/session callbacks
3. Route handler at `api/auth/[...nextauth]/route.ts`
4. Sign up endpoint `api/auth/register` (Zod validated, bcrypt hash)
5. Login/register pages with the bloom design language

**Checkpoint:** User can register, log in, and session contains role.

### 9B — RBAC Middleware
**Commit:** `security: add middleware protecting admin routes by role`
Create `src/middleware.ts`: `/admin/*` and `/api/admin/*` require session with role FLORIST or ADMIN; `/checkout`, `/orders`, `/api/orders` require any session. Redirect unauthenticated to /login.

**Checkpoint:** Anonymous → /admin redirects to login; CUSTOMER role → /admin gets 403.

### 9C — Defense in Depth on API Routes
**Commit:** `security: add session and role checks inside protected API routes`
Every protected route calls `getServerSession` and re-verifies role/ownership internally — middleware alone is not trusted. Add an `requireRole()` helper in `lib/auth.ts`.

**Checkpoint:** Calling `/api/admin/products` with a CUSTOMER token returns 403 even bypassing middleware.

### 9D — Rate Limiting
**Commit:** `security: add Upstash rate limiting to AI and auth endpoints`
1. `npm install @upstash/ratelimit @upstash/redis` (user creates free Upstash DB, adds env vars)
2. `src/lib/ratelimit.ts` — sliding window: 5/min for AI endpoints, 10/min for auth
3. Apply in quiz, moodboard, register, login routes; return 429 with Retry-After

**Checkpoint:** 6th quiz submission inside a minute returns 429.

### 9E — Security Headers
**Commit:** `security: add CSP, HSTS and hardening headers`
Configure headers in `next.config.js`: Content-Security-Policy (allow self, Stripe JS, Supabase, Replicate image domains), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy.

**Checkpoint:** Response headers visible in devtools; app still functions (CSP not blocking legit assets).

---

## Phase 10 — Catalog + AI Recommendations

### 10A — Catalog Page
**Commit:** `feat: add product catalog page with category and price filters`
Server component fetching products via Prisma, filter UI (category, price range, flower type), responsive grid of ProductCards using the bloom palette.

**Checkpoint:** /catalog lists seeded products; filters work via searchParams.

### 10B — Product Detail
**Commit:** `feat: add product detail page with gallery and add-to-cart`
`/product/[slug]` — image, description, price, stock indicator, quantity selector, Add to Cart button (wired in Phase 11).

**Checkpoint:** Clicking a card opens its detail page.

### 10C — RAG Recommendations
**Commit:** `feat: match AI profile to real in-stock products via catalog-aware prompting`
Update quiz prompt: inject a compact JSON of active, in-stock products (id, name, flowers, palette tags). GPT must return `recommendedProductIds` selected ONLY from that list, plus the profile. Validate IDs exist. Return full product objects with the profile.

**Checkpoint:** Quiz results show 3–5 real products from the seeded catalog.

### 10D — Recommendations UI
**Commit:** `feat: display recommended products with profile match reasoning`
Results page shows FloralProfileCard + a "Matched for you" product row with a one-line reason per product (from GPT), linking to detail pages.

**Checkpoint:** End-to-end: quiz → profile → clickable real products.

---

## Phase 11 — Cart + Stripe Checkout

### 11A — Cart State
**Commit:** `feat: add cart state with Zustand and cart drawer UI`
`npm install zustand`. Cart store (add, remove, update qty, total). Persist to sessionStorage. CartDrawer component with line items and checkout CTA.

**Checkpoint:** Add-to-cart from catalog/detail updates the drawer and badge count.

### 11B — Stripe Setup + PaymentIntent
**Commit:** `feat: add Stripe PaymentIntent creation endpoint`
1. `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
2. `src/lib/stripe.ts` server client
3. `POST /api/orders`: Zod-validate items, re-fetch prices from DB (never trust client prices), verify stock, create Order (PENDING) + OrderItems in a transaction, create PaymentIntent with order metadata, return clientSecret

**Checkpoint:** curl with valid items returns clientSecret; order row is PENDING.

### 11C — Checkout Page
**Commit:** `feat: add checkout page with Stripe Elements`
Checkout page: order summary + Stripe PaymentElement, confirm payment client-side, redirect to `/orders/[id]/confirmation` on success. Use Stripe test mode cards.

**Checkpoint:** Test card 4242… completes payment.

### 11D — Stripe Webhook
**Commit:** `security: add signature-verified Stripe webhook advancing order status`
`POST /api/webhooks/stripe`: verify signature with STRIPE_WEBHOOK_SECRET, on `payment_intent.succeeded` set order CONFIRMED and decrement product stock atomically; on failure set CANCELLED. Use `stripe listen` locally.

**Checkpoint:** Completing payment flips order to CONFIRMED and stock decreases.

### 11E — Order History
**Commit:** `feat: add customer order history and confirmation pages`
`/orders` lists the session user's orders with status badges; confirmation page shows items, total, and status timeline.

**Checkpoint:** Owner sees own orders; another user's order ID returns 403.

---

## Phase 12 — Admin Dashboard

### 12A — Admin Shell
**Commit:** `feat: add protected admin layout with navigation`
`/admin` layout: sidebar (Dashboard, Inventory, Orders), header with user + sign out. Server-side role check in layout as well.

**Checkpoint:** FLORIST/ADMIN sees the shell; CUSTOMER is blocked.

### 12B — Inventory Management
**Commit:** `feat: add inventory table with product CRUD and stock editing`
InventoryTable: list products with inline stock editing, create/edit product modal (Zod-validated), soft-delete via `active` flag. API: `api/admin/products` (POST/PATCH/DELETE, role-checked).

**Checkpoint:** Editing stock in the UI persists; catalog reflects changes.

### 12C — Order Pipeline
**Commit:** `feat: add admin order pipeline with status management`
Orders board grouped by status with action buttons advancing CONFIRMED → PREPARING → SHIPPED → DELIVERED via `PATCH /api/admin/orders/[id]` (validate legal transitions only).

**Checkpoint:** Advancing status updates customer's order history view.

### 12D — Dashboard Analytics
**Commit:** `feat: add admin dashboard with sales and low-stock indicators`
Stat cards (revenue, orders this week, pending orders), low-stock alert list (stock < 5), simple revenue-by-day chart (recharts).

**Checkpoint:** Numbers match seeded/created data.

---

## Phase 13 — AI Mood Board (Replicate)

### 13A — Replicate Integration
**Commit:** `feat: add mood board generation via Replicate Flux`
1. `npm install replicate`
2. `POST /api/moodboard/generate`: rate-limited, session-required; builds deterministic prompt from the user's FloralProfile; calls Flux; downloads result
3. Upload to Supabase Storage; save public URL on FloralProfile

**Checkpoint:** Endpoint returns an image URL; file exists in Supabase Storage.

### 13B — Mood Board UI
**Commit:** `feat: display AI mood board in quiz results with generation state`
"Visualize my arrangement" button on results → skeleton shimmer while generating → reveal image with entrance animation. Cache: if moodBoardUrl exists, show immediately.

**Checkpoint:** Full flow: quiz → profile → generate → image displayed.

---

## Phase 14 — 3D & Visual Experience

### 14A — Motion Stack Setup
**Commit:** `chore: add React Three Fiber, GSAP, and Lenis motion stack`
`npm install three @react-three/fiber @react-three/drei gsap lenis`. Create `components/three/Scene.tsx` canvas wrapper with dynamic import (`ssr: false`), Lenis provider in root layout, GSAP ScrollTrigger registration, and a `useReducedMotion` hook gating all of it.

**Checkpoint:** Empty canvas renders; smooth scroll active; `prefers-reduced-motion` disables both.

### 14B — 3D Petal Hero (Signature Element)
**Commit:** `feat: add 3D petal field hero with cursor parallax`
`PetalField.tsx`: ~200 instanced petal meshes (simple curved planes, bloom palette materials) drifting with gentle sine motion, subtle cursor parallax via useFrame. Hero headline overlaid; petals part slightly on scroll. Mobile: reduce to 60 instances. Reduced motion: static arrangement.

**Checkpoint:** 60fps on desktop; graceful mobile fallback; headline readable.

### 14C — Scroll Story
**Commit:** `feat: add GSAP scroll-driven storytelling sections`
Landing sections pinned with ScrollTrigger: (1) the Marco problem, (2) how the AI works — quiz/profile/moodboard visuals sliding in, (3) CTA to the quiz. Parallax floral images, text reveals on scroll.

**Checkpoint:** Scrolling the landing tells the story smoothly; no jank; reduced-motion shows static sections.

### 14D — 3D Bouquet Viewer
**Commit:** `feat: add interactive 3D bouquet preview on product pages`
`BouquetViewer.tsx`: load a .glb bouquet model (Drei useGLTF, OrbitControls with zoom limits, soft studio lighting). Show on product detail for featured products; static image fallback otherwise/mobile.

**Checkpoint:** Model rotates via drag; loads lazily; fallback works.

### 14E — Transitions & Micro-interactions
**Commit:** `feat: add page transitions and interaction polish with Framer Motion`
Route transition fade/slide via template.tsx, magnetic hover on primary CTAs, card hover lift + petal accent, animated cart badge, staggered catalog grid entrance.

**Checkpoint:** Interactions feel cohesive, not scattered; nothing over 300ms.

### 14F — Performance Pass
**Commit:** `perf: optimize 3D assets, lazy loading, and bundle size`
Dynamic imports for all three/ components, draco-compress models, next/image everywhere, font subsetting, check bundle with `next build` analyzer.

**Checkpoint:** Lighthouse Performance ≥ 85 with 3D hero on desktop; ≥ 90 mobile (fallback).

---

## Phase 15 — Hardening & QA

### 15A — E2E Tests
**Commit:** `test: add Playwright E2E tests for quiz, checkout and admin flows`
`npm install -D @playwright/test`. Tests: (1) quiz → profile → recommendations, (2) add to cart → checkout with test card → order CONFIRMED, (3) customer blocked from /admin, (4) admin updates stock.

**Checkpoint:** `npm run test:e2e` green.

### 15B — Security Audit
**Commit:** `security: audit pass — ownership checks, error hygiene, dependency scan`
Checklist: every route Zod-validated; ownership verified on all [id] routes; errors never leak stack traces or internals; `npm audit` clean or documented; no secrets in client bundle (`grep` the build output for key prefixes).

**Checkpoint:** Written checklist committed to `docs/security-audit.md`, all items checked.

### 15C — Accessibility
**Commit:** `fix: accessibility pass — focus, contrast, reduced motion, semantics`
Keyboard-navigable quiz and checkout, visible focus rings, form labels, color contrast ≥ 4.5:1 for text, aria-live on cart updates, reduced-motion verified across all animated components.

**Checkpoint:** Lighthouse Accessibility ≥ 95.

---

## Phase 16 — CI/CD + Deploy

### 16A — GitHub Actions
**Commit:** `chore: add CI pipeline with lint, test and build jobs`
`.github/workflows/ci.yml`: on PR + main push → install, lint, jest, build (with dummy env vars). Jobs chained with `needs`.

**Checkpoint:** Pipeline green on GitHub.

### 16B — Vercel Deploy
**Commit:** `chore: configure Vercel deployment`
Connect repo to Vercel; set all production env vars (DATABASE_URL, OPENAI, STRIPE keys + webhook secret, REPLICATE, UPSTASH, NEXTAUTH_SECRET/URL); configure Stripe webhook to production URL.

**Checkpoint:** Production URL serves the app; preview URLs on PRs.

### 16C — Production Migration + Smoke Test
**Commit:** `chore: add prisma migrate deploy step and production smoke checklist`
Add `prisma migrate deploy` to build; run through the full journey in production with a Stripe test payment; document the smoke checklist in `docs/launch-checklist.md`.

**Checkpoint:** Complete customer journey works in production. 🚀

---

# WORKING RULES FOR CLAUDE CODE

1. **One sub-phase per request.** Never combine unless explicitly asked.
2. **Verify the checkpoint before committing.** Build, curl, or browser-check first.
3. **Branch per phase** (`feat/phase-11-checkout`), merge to main when the phase's checkpoints pass.
4. **Plan Mode for any sub-phase touching 3+ files.**
5. **Never read, print, or modify `.env.local`.** Never commit anything resembling a secret.
6. **Never trust client input** — prices, IDs, roles always re-verified server-side.
7. **Every new API route ships with:** Zod validation, auth check (if protected), and correct status codes — no exceptions.
8. **3D/motion code always ships with** a reduced-motion path and a mobile fallback.
9. **If a checkpoint fails, stop and fix.** Never advance on a broken checkpoint.
10. **Push after every 2–3 commits.**

# CURRENT STATE TRACKING

At session start: run `git log --oneline -15` and `git branch` to locate progress. Announce which sub-phase is next before executing. After completing, state what was done and what comes next.