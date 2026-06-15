# Ark Ministry AI — Setup Guide

A church-focused membership site: AI guides gated behind a $12.99/month Stripe subscription,
with Supabase handling accounts and Cohortia linked for community.

There are **4 things to set up**. Take them in order — about 20 minutes total.

---

## 1. Supabase — create the database tables

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open the file `supabase-schema.sql` (in this folder), copy everything, paste it in, click **Run**.
3. Done. This creates the `profiles` table and auto-creates a profile whenever someone signs up.

> Your URL and anon key are already filled into `index.html` and the guide pages.
> The anon key is *meant* to be public — it's safe in the browser.

**One Supabase setting to check:** Authentication → Providers → Email.
For the smoothest start, you can turn **"Confirm email" OFF** so people can log in immediately
after signing up. (Leave it on if you'd rather verify emails — members just confirm before first login.)

---

## 2. Stripe — get your keys

You already created the product and the $12.99/mo price. Now grab:

- **Secret key** — Stripe Dashboard → Developers → API keys → *Secret key* (`sk_live_...` or `sk_test_...`).
  ⚠️ This is private. You'll paste it into Netlify in step 4 — never into the website files.
- **Price ID** — you already have this: `price_1TiURaALjv5smxrgf6ayDQ53`

We'll set up the **webhook** in step 4 after the site is live (it needs the live URL).

---

## 3. Deploy to Netlify

Because of the Stripe functions, deploy the **whole folder** (not a single file):

**Easiest way — drag & drop won't run the functions, so use Git or the CLI:**

Option A — Netlify CLI (recommended):
```
npm install -g netlify-cli
cd church-ai-guides
netlify deploy --prod
```

Option B — push this folder to a GitHub repo, then in Netlify: **Add new site → Import from Git** → pick the repo.
Netlify reads `netlify.toml` and builds the functions automatically.

---

## 4. Netlify — add the secret environment variables

In your Netlify site → **Site configuration → Environment variables**, add these:

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | your `sk_live_...` (or `sk_test_...`) secret key |
| `STRIPE_PRICE_ID` | `price_1TiURaALjv5smxrgf6ayDQ53` |
| `SUPABASE_URL` | `https://baqmkktggczzyoldlkal.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role** key (Settings → API) |
| `SITE_URL` | your live Netlify URL, e.g. `https://yoursite.netlify.app` |
| `STRIPE_WEBHOOK_SECRET` | from the webhook step below |

> This is where the service_role key belongs — locked in Netlify's server environment,
> never in the browser. The webhook function uses it to mark members active after they pay.

**Set up the Stripe webhook:**
1. Stripe Dashboard → Developers → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://YOURSITE.netlify.app/.netlify/functions/stripe-webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.created`, `customer.subscription.deleted`.
4. Save, then copy the **Signing secret** (`whsec_...`) into the `STRIPE_WEBHOOK_SECRET` env var above.
5. Redeploy (Netlify → Deploys → Trigger deploy) so the new env vars take effect.

---

## 5. Cohortia community link & hero image

Open `index.html`, find `COMMUNITY_URL` near the top of the `<script>` config block,
and paste your real Cohortia space URL. (Same spot lets you edit the guide list later.)

**Hero image:** download the church-team image generated in the chat, save it as
`hero.png`, and drop it into the `assets/` folder. The site loads `assets/hero.png`
automatically. (Until you add it, the hero shows the navy background, which still looks fine.)

**Coaching link:** the "Explore coaching" buttons already point to
`https://arkagencysite.netlify.app/` — change that in `index.html` if your coaching page moves.

---

## How membership works (the flow)

1. Visitor signs up → Supabase creates their account + profile (status: `inactive`).
2. They land on the dashboard, see the **Start membership** button → Stripe Checkout.
3. They pay → Stripe fires the webhook → the function flips their status to `active`.
4. Guides unlock instantly. They can **Manage billing** to cancel anytime (Stripe portal).

## Adding more guides later

1. Copy any file in `/guides/` as a starting point, write the new guide, save it in `/guides/`.
2. In `index.html`, add a line to the `GUIDES` array (title, description, and the file path).
3. Redeploy. That's it.

---

### Test it first
Use Stripe **test mode** keys + test card `4242 4242 4242 4242` (any future date / any CVC)
to walk the whole flow before going live. When ready, swap to live keys and redeploy.
