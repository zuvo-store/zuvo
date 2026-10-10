# ZUVO — Discover More. Shop Smarter.

> **DEMO MARKETPLACE — no real transactions.** ZUVO is a demonstration e-commerce
> application with original branding, layouts, and placeholder artwork. Payments are
> **simulated** (no real charge is ever attempted), rewards are **simulated** with no
> cash value, and product images are locally generated SVG placeholders. Do not enter
> real card numbers or CVVs anywhere — the app never asks for them.

## Quick start

Requirements: Node 18+, npm. No external services needed.

```bash
npm install
npx prisma migrate deploy   # create the SQLite database (prisma/dev.db)
npm run db:seed             # 8 categories, 48 products, demo users, $20 campaign
npm run build
npm start                   # http://localhost:3000
```

Dev mode: `npm run dev`. Fresh reset: delete `prisma/dev.db`, then re-run the
commands above.

## Demo accounts

| Role     | Email              | Password   |
|----------|--------------------|------------|
| Admin    | admin@zuvo.demo    | admin1234  |
| Customer | customer@zuvo.demo | demo1234   |

The admin account owns the demo referral code **`SUMMER2K26`** (prefilled, editable
at signup). Guests can shop, cart, and check out without an account.

## Demo payment scenarios

Checkout → Payment step shows a scenario picker (no card form exists anywhere):

| Scenario   | Result                                              |
|------------|-----------------------------------------------------|
| success    | Payment SUCCEEDED, order CONFIRMED, stock deducted  |
| declined   | Payment DECLINED, order stays PENDING_PAYMENT, cart kept |
| pending    | Payment PENDING — use “Simulate provider confirmation” to confirm |
| cancelled  | Payment CANCELLED, cart kept                        |
| error      | Technical error, cart and order summary preserved   |

A promo code is seeded for testing: **`WELCOME10`** (10% off orders over $25).

## What’s stubbed

- **Email sending** (verification, password reset): needs SMTP env vars
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`).
  When unset, flows still work end-to-end — the token link is shown inline labeled
  **DEMO ONLY** instead of being emailed. See `.env.example`.
- **Payments** are a `DemoPaymentProvider` (`lib/payments.ts`) by design — there is
  no gateway integration and never will be in this demo.

## Project layout

```
app/                    # Routes: shop, cart, checkout, auth, account, rewards, admin
  api/                  # JSON APIs (cart, checkout, payments, auth, rewards, referrals, …)
components/             # Shared UI (header, footer, product cards, admin shell, …)
lib/                    # Server core: db, auth (sessions), cart, checkout,
                        # payments (demo provider), rewards, referrals, audit, settings, email
prisma/
  schema.prisma         # SQLite data model (money = integer cents everywhere)
  seed.ts               # Catalog, users, campaign, promo (re-runnable)
  dev.db                # Local database (created by migrate)
public/p/               # Generated SVG product/category placeholder art
proxy.ts                # Edge: issues the guest cart cookie (Next 16 rule)
```

Key routes: `/`, `/search`, `/category/[slug]`, `/product/[slug]`, `/deals`,
`/cart`, `/checkout` (+ `/review`, `/payment`, `/result`), `/track-order`,
`/auth/*`, `/account/*`, `/rewards/*`, `/admin/*` (dashboard, products, categories,
inventory, orders, customers, rewards, referrals, promotions, payments, reports,
audit logs, settings).

## Notes

- Auth: bcrypt-hashed passwords, HMAC-signed httpOnly session cookies, rate-limited
  login/signup, email-verification + password-reset token flows.
- Money is stored as integer cents; totals are always recomputed server-side —
  browser prices are never trusted.
- Orders and payments have separate statuses; inventory is deducted atomically with
  the successful payment (no negative stock).
- Admin mutations are audit-logged (`/admin/audit-logs`).
