# Going live on Vercel

The shop and its admin panel run as one Next.js app on Vercel, with a MongoDB Atlas database, Vercel Blob for
images, Stripe for payments and Resend for email. Only the shop owner can sign in to `/admin`.

Do these steps in order. Steps 1–5 need the owner's own accounts; the rest can be done by whoever deploys.

## 1. Accounts the owner creates

| Service | What for | Notes |
| --- | --- | --- |
| GitHub | Holds the code; Vercel deploys from it | Create a **new private repository** for the shop (not the cloner template). |
| Vercel | Hosting | Pro plan recommended for a business site. |
| MongoDB Atlas (via Vercel → Integrations → MongoDB Atlas, or mongodb.com/atlas) | Database | Creates `MONGODB_URI`. The free M0 cluster is enough to start; choose a London/EU region. |
| Vercel Blob (Vercel → Storage → Blob) | Product and page images | Creates `BLOB_READ_WRITE_TOKEN` automatically. |
| Stripe | Card payments | Complete business verification before taking live payments. |
| Resend | Order, password-reset and message emails | Verify the shop's email domain (DNS records). |
| Domain name | e.g. `www.yourshop.co.uk` | Point it at Vercel (Vercel → Domains). |

## 2. Push the code

```bash
git remote set-url origin https://github.com/<owner>/<new-shop-repo>.git
git push -u origin main
```

The reference catalogue copied from the original site (`data/cctvmaster/`, `public/sites/cctvmaster/`) is kept
in the private repository as local development data. It is listed in `.vercelignore` and is never deployed. Keep
the repository private while it contains this material.

## 3. Create the Vercel project

Import the GitHub repository in Vercel. Framework: Next.js. Build command and output: defaults (`npm run build`).

## 4. Environment variables (Vercel → Settings → Environment Variables, Production)

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Set by the MongoDB Atlas integration, or the Atlas connection string (`mongodb+srv://…`). |
| `MONGODB_DB` | Database name, e.g. `shop` (defaults to `shop`). |
| `BLOB_READ_WRITE_TOKEN` | Set by the Blob integration. |
| `BETTER_AUTH_SECRET` | A new long random string, e.g. output of `openssl rand -base64 32`. Never reuse the local one. |
| `BETTER_AUTH_URL` | `https://www.yourshop.co.uk` (the public address; used in emails and Stripe return links). |
| `SITE_URL` | Same as `BETTER_AUTH_URL`. |
| `STRIPE_SECRET_KEY` | From Stripe → Developers → API keys (`sk_live_…`; use `sk_test_…` for a trial run). |
| `STRIPE_WEBHOOK_SECRET` | From the webhook created in step 6 (`whsec_…`). |
| `RESEND_API_KEY` | From Resend → API keys. |
| `EMAIL_FROM` | e.g. `Your Shop <orders@yourshop.co.uk>` (must be on the verified domain). |
| `SHOP_NOTIFY_EMAIL` | Fallback address for new-order and new-message alerts (the admin's Settings → Notifications takes priority). |

## 5. Create the database indexes and the owner account

From a computer with the project, pointing at the production database (copy `MONGODB_URI` from Vercel):

```bash
# PowerShell: $env:MONGODB_URI="mongodb+srv://…"
npm run db:setup
npm run admin:create -- --email owner@yourshop.co.uk --name "Owner Name" --password "a-long-passphrase"
```

- There can only ever be **one owner**. To hand the shop to someone else later, run `admin:create` again with
  `--replace`.
- **Never** run `npm run db:seed:dev` against production (it refuses non-local databases anyway).

## 6. Stripe webhook

Stripe → Developers → Webhooks → Add endpoint:

- URL: `https://www.yourshop.co.uk/api/stripe/webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`

Copy its signing secret into `STRIPE_WEBHOOK_SECRET`, then redeploy.

## 7. Deploy and fill in the shop

1. Deploy (Vercel → Deployments → Redeploy, or push to `main`).
2. Sign in at `https://www.yourshop.co.uk/admin/login` as the owner.
3. **Settings:** shop name, logo, phone, email, address, opening hours, company number, VAT number, delivery prices,
   notification emails, SEO title and description.
4. **Categories → Products → Media:** build the real catalogue (or import products via the admin).
5. **Content:** homepage sections, navigation and footer, and the information pages — especially **Terms, Privacy,
   Cookies, Returns and Delivery**, which must be the owner's own legal text.
6. **Marketing:** discount codes, if any.

## 8. Before announcing the shop

- Place a real order with Stripe **test** keys first (card `4242 4242 4242 4242`), check the confirmation email,
  dispatch it from Admin → Orders (tracking email), refund it — then switch to live keys.
- Submit the contact form and check the message arrives in Admin → Messages and by email.
- Check password reset for a customer account.
- In Vercel, confirm the production deployment shows no errors under Logs.

## Ongoing

- After pulling a new version, run `npm run db:setup` against production (it only adds missing indexes).
- MongoDB Atlas: turn on backups (a paid cluster tier) before the shop takes real orders.
- Every admin change is recorded under Admin → Activity.
