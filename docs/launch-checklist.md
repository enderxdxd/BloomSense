# BloomSense Launch Checklist

## Vercel Environment

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`
- [ ] `OPENAI_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `REPLICATE_API_TOKEN` if Replicate is re-enabled
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

## Deploy Steps

- [ ] Connect the GitHub repo to Vercel.
- [ ] Confirm Vercel uses `npm run build:deploy`.
- [ ] Confirm `prisma migrate deploy` runs before the Next.js production build.
- [ ] Configure the Stripe webhook endpoint to `https://<production-domain>/api/webhooks/stripe`.
- [ ] Push a PR and confirm preview deployment is created.
- [ ] Merge to `main` and confirm production deployment completes.

## Production Smoke Test

- [ ] Open the production URL.
- [ ] Take the quiz and confirm a floral profile renders.
- [ ] Generate or load a mood board.
- [ ] Open a recommended product.
- [ ] Add a product to cart.
- [ ] Register or sign in.
- [ ] Complete checkout with Stripe test card `4242 4242 4242 4242`.
- [ ] Confirm the order page shows `CONFIRMED`.
- [ ] Confirm product stock decreased in admin inventory.
- [ ] Confirm a customer cannot access `/admin`.
- [ ] Confirm an admin can update inventory stock.
- [ ] Confirm `/orders/[id]/confirmation` returns 403 for another user.
- [ ] Run the client bundle secret scan from `docs/security-audit.md`.
