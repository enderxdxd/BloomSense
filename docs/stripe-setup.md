# Enabling payments (Stripe)

Everything in the checkout path is implemented and tested; the only thing
standing between it and a working payment is a set of keys. Until they
exist the app degrades on purpose: `/api/orders` answers **503** and the
checkout page renders a "payments aren't configured" notice instead of a
card form. Nothing is broken — it just can't charge anyone.

This is the one part of the build only the shop owner can do, because it
requires their Stripe account.

## 1. Test keys (5 minutes)

1. Create a free account at <https://dashboard.stripe.com/register>.
   No business details are needed for test mode.
2. Open <https://dashboard.stripe.com/test/apikeys> and copy both keys.
3. Add them to `.env.local`:

   ```
   STRIPE_SECRET_KEY=sk_test_<your-test-secret-key>
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your-test-publishable-key>
   ```

Only the publishable key is exposed to the browser — that's what the
`NEXT_PUBLIC_` prefix means, and it's the only variable in this project
that carries it. The secret key must never gain that prefix.

## 2. Webhook secret (needed for orders to confirm)

Payment succeeds in the browser, but the order only becomes CONFIRMED —
and stock only decrements — when Stripe calls the webhook back. Locally
that needs the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`stripe listen` prints a signing secret (`whsec_...`). Put it in
`.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
Leave `stripe listen` running while testing.

### In production (Vercel)

1. **Use the stable production domain**, from Vercel > Project > Domains —
   something like `bloom-sense.vercel.app`. Do *not* use the URL of a
   single deployment (`bloom-sense-6dutytfjs-….vercel.app`): that address
   is minted per deploy, so the webhook would break on the next push.
2. **Turn off Deployment Protection for production**, under Vercel >
   Project > Settings > Deployment Protection. While it is on, every
   request without a Vercel session gets an HTML login page, so Stripe's
   POST is answered with 401 and never reaches the route. This is the most
   common reason a correctly configured webhook still fails.
3. Create the endpoint at <https://dashboard.stripe.com/test/webhooks>
   pointing at `https://<your-production-domain>/api/webhooks/stripe`,
   subscribed to `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `payment_intent.canceled` and
   `charge.refunded`.
4. Copy that endpoint's signing secret — it is **not** the same `whsec_`
   the CLI printed — into Vercel as `STRIPE_WEBHOOK_SECRET`, scoped to
   Production.
5. **Redeploy.** Environment variables are read at build and boot; an
   existing deployment will not pick up the new value on its own.

### Reading the result

Stripe logs every attempt under the endpoint's *Events* tab. The response
code says exactly what is wrong:

| Response | Meaning |
| --- | --- |
| `200 {"received":true}` | Working. |
| `503 Webhook is not configured.` | `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` missing in that environment. |
| `400 Invalid signature.` | Wrong secret — usually the CLI's `whsec_` used in production, or the endpoint was recreated and its secret rotated. |
| `400 Missing stripe-signature header.` | Something other than Stripe called the route. |
| `401` / an HTML page | Deployment Protection is still on (step 2). |

Stripe retries a failed delivery for about three days, so orders left
PENDING while the secret was missing will confirm themselves once the
configuration is fixed — no need to re-run those payments.

## 3. Walk the flow

With all three variables set:

1. Add an arrangement to the cart and open `/checkout`.
2. Fill the delivery details — the payment step stays disabled until
   they're valid.
3. Pay with `4242 4242 4242 4242`, any future expiry, any CVC.
   ([More test cards](https://docs.stripe.com/testing).)
4. You land on the confirmation page. It shows PENDING for a moment;
   once the webhook fires it flips to CONFIRMED and the product's stock
   drops by the quantity ordered.
5. Press **Cancel & refund** on that page. The order becomes REFUNDED,
   the stock comes back, and the refund appears in the Stripe dashboard.

To test a failing payment, use `4000 0000 0000 9995` (declined) — the
order should end up CANCELLED and stock should be untouched.

## What runs without keys

Everything except charging a card: the catalog, search, cart, quiz and
its 3-per-account saving, mood boards, the admin dashboard, inventory
and the order pipeline. Orders simply can't be created, so the order
history stays empty.
