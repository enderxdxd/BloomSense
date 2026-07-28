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
- [ ] Configure the Stripe webhook endpoint to `https://<production-domain>/api/webhooks/stripe`,
      subscribed to payment_intent.succeeded, payment_intent.payment_failed,
      payment_intent.canceled and charge.refunded (see docs/stripe-setup.md).
- [ ] Push a PR and confirm preview deployment is created.
- [ ] Merge to `main` and confirm production deployment completes.

## Production Smoke Test (full customer journey)

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

## Commerce Verification (added with the full-commerce build)

- [ ] `/catalog` lists the seeded catalogue; search (`?q=`), category and
      price filters all narrow it.
- [ ] Add to cart from a product page; `/cart` and the drawer agree on
      quantities and totals.
- [ ] Delivery fee shows below $150 of items and reads "Free" above it.
- [ ] Checkout refuses to start payment until the delivery details are
      valid, and rejects a past delivery date server-side.
- [ ] Pay with `4242 4242 4242 4242`; the order flips PENDING → CONFIRMED
      via the webhook and product stock drops.
- [ ] "Cancel & refund" on a CONFIRMED order refunds in Stripe, sets
      REFUNDED, and restores stock.
- [ ] Admin pipeline shows each order's recipient, address, delivery date
      and card message, and can refund a paid order.
- [ ] Admin dashboard revenue excludes refunded orders and the Refunded
      card shows the amount returned.
- [ ] Register an account, run the quiz 4 times: the first 3 save, the
      4th returns a profile but reports the limit.
- [ ] `/account` shows slot usage; deleting a saved quiz frees a slot.
- [ ] Another user's order id 404s; another user's saved profile 404s.
