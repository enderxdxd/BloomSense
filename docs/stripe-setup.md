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
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
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

In production, create the endpoint at
<https://dashboard.stripe.com/test/webhooks> pointing at
`https://<your-domain>/api/webhooks/stripe`, subscribe it to
`payment_intent.succeeded`, `payment_intent.payment_failed`,
`payment_intent.canceled` and `charge.refunded`, then copy that
endpoint's signing secret into the deployment environment.

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
