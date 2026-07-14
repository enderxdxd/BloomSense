# BloomSense Security Audit

Date: 2026-07-14

## Phase 15B Checklist

- [x] Authentication is centralized through NextAuth JWT sessions in `src/lib/auth.ts`.
- [x] Admin routes are protected in `src/middleware.ts` and rechecked server-side in `src/app/admin/layout.tsx`.
- [x] Protected API routes call `requireSession()` or `requireRole()` instead of trusting middleware alone.
- [x] External JSON bodies are parsed defensively and validated with Zod before mutation.
- [x] Order detail reads enforce owner-only access in `src/app/api/orders/[id]/route.ts`.
- [x] Admin order status changes validate legal transitions before persistence.
- [x] Stripe webhooks require `stripe-signature` and use `stripe.webhooks.constructEvent`.
- [x] Client order creation re-reads product price and stock from Prisma.
- [x] AI/image/auth endpoints are rate-limited with Upstash when configured, with an in-memory dev fallback.
- [x] Error responses avoid stack traces and return generic production-safe messages.
- [x] Security headers are configured in `next.config.mjs`, including CSP, HSTS, frame denial, content sniffing protection and referrer policy.
- [x] No `.env.local` contents were read, printed or modified during this pass.

## Dependency Audit

`npm audit --audit-level=high` reports 14 vulnerabilities: 2 low, 7 moderate and 5 high.

This is not clean yet. The high-severity items include `form-data`, `glob` through `eslint-config-next`, and `next`. Several suggested fixes require breaking changes such as `next@16`, `next-auth@3`, or `prisma@6`, so they were documented rather than forced in this pass.

Next audit step: apply safe non-breaking updates first, then test any framework/auth/ORM major change on a dedicated branch.

## Client Bundle Secret Scan

After a successful production build, scan generated output for secret prefixes before deployment:

```powershell
rg "sk_live_|sk_test_|whsec_|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|UPSTASH_REDIS_REST_TOKEN" .next
```

Expected result: no matches for real secrets. Placeholder strings in CI/build docs are acceptable only when they are not real credentials.

Local result for this pass: no matches in public/static bundles for Stripe key prefixes or server-only env names.

## Residual Risks

- Full Stripe card completion requires real Stripe test keys and webhook forwarding.
- Production ownership and admin flows should be smoke-tested against the deployed database after Vercel env vars are set.
- Lighthouse Accessibility needs a browser run after the app builds cleanly.
