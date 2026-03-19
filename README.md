# Autopilot — Creator OS

AI-powered influencer platform. Trend detection, script writing, thumbnail design,
video SEO optimization, analytics, and full content pipeline autopilot.

---

## What's in this project

```
autopilot-full/
  backend/              Node.js API server
  frontend/             React app (Vite)
  docker-compose.yml    Runs everything with one command
  .env.example          Environment variable template
```

---

## Option A — Run with Docker (EASIEST, recommended)

This is the simplest path. Docker handles PostgreSQL and Redis for you.
You do NOT need to install PostgreSQL separately.

### Step 1 — Install Docker Desktop

1. Go to **docker.com/products/docker-desktop**
2. Click **Download for Windows**
3. Run the installer, restart your computer when asked
4. After restart, Docker Desktop opens automatically — wait for it to say "Engine running"

### Step 2 — Set up your environment file

1. Open the `autopilot-full` folder
2. Find the file called `.env.example`
3. Copy it and rename the copy to `.env` (just `.env`, no "example")
4. Open `.env` in Notepad
5. Fill in these two lines:

```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
JWT_SECRET=any-long-random-string-at-least-32-characters-long
```

Get your Anthropic key at: **console.anthropic.com → API Keys**
For JWT_SECRET just type any long random string like: `mySecretKey2025AutopilotPlatformXYZ`

Save the file.

### Step 3 — Start everything

1. Press Windows key, type **cmd**, press Enter
2. Type this and press Enter:

```
cd Desktop\autopilot-full
docker compose up
```

Wait 2-3 minutes the first time (it downloads PostgreSQL, Redis, builds the app).
You'll see lots of text. It's done when you see:

```
autopilot_api  | ✅ Server running on http://localhost:3001
```

### Step 4 — Create test data

Open a **second** Command Prompt window and type:

```
cd Desktop\autopilot-full\backend
npm install
npm run seed
```

You'll see:
```
Login email:    test@autopilot.io
Login password: password123
```

### Step 5 — Open the app

Go to **http://localhost:5173** in your browser.

Log in with `test@autopilot.io` / `password123` and everything works.

### To stop

Go back to the first Command Prompt and press **Ctrl + C**

### To start again next time

```
cd Desktop\autopilot-full
docker compose up
```

---

## Option B — Run without Docker (manual setup)

Use this if you can't install Docker.

### Step 1 — Install Node.js

1. Go to **nodejs.org** → download LTS → install it
2. Open Command Prompt, verify: `node --version`

### Step 2 — Install PostgreSQL

1. Go to **postgresql.org/download/windows**
2. Download and run the installer
3. When asked for a password, use: `autopilot123`
4. Leave port as `5432`, finish installation

### Step 3 — Create the database

1. Press Windows key → search **pgAdmin** → open it
2. Enter your password
3. Left panel: right-click **Databases → Create → Database**
4. Name it `autopilot`, click Save
5. Right-click the `autopilot` database → **Query Tool**
6. Paste this and click the ▶ button:

```sql
CREATE USER autopilot WITH PASSWORD 'autopilot123';
GRANT ALL PRIVILEGES ON DATABASE autopilot TO autopilot;
```

### Step 4 — Set up backend

```
cd Desktop\autopilot-full\backend
npm install
```

Copy `.env.example` to `.env` and fill in:
```
ANTHROPIC_API_KEY=sk-ant-your-key
JWT_SECRET=any-long-random-string
```

Run migrations and seed:
```
npm run setup
```

Start the backend:
```
npm run dev
```

### Step 5 — Set up frontend

Open a second Command Prompt:

```
cd Desktop\autopilot-full\frontend
npm install
```

Create a `.env` file in the frontend folder containing:
```
VITE_API_URL=http://localhost:3001
```

Start the frontend:
```
npm run dev
```

### Step 6 — Open the app

Go to **http://localhost:5173**

---

## Setting up Stripe payments (optional for local testing)

You can use the app without Stripe — payments just won't work until you set this up.

### Create Stripe account and get keys

1. Go to **stripe.com** → create free account
2. Dashboard → **Developers → API keys**
3. Copy the **Secret key** (starts with `sk_test_`)
4. Add to your `.env`:

```
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### Create products in Stripe

1. Stripe Dashboard → **Products → Add product**
2. Create three products:

| Product name | Price    | Billing |
|---|---|---|
| Starter      | $29/month | Recurring |
| Pro          | $79/month | Recurring |
| Agency       | $199/month | Recurring |

3. For each product, copy the **Price ID** (starts with `price_`)
4. Add to `.env`:

```
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
```

### Set up webhook for local testing

1. Install Stripe CLI: **stripe.com/docs/stripe-cli**
2. Open a new Command Prompt:

```
stripe login
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

3. It gives you a webhook secret — add to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

4. Restart your backend

Test card: `4242 4242 4242 4242` · any future date · any CVC

---

## Project structure explained

### Backend

| File | What it does |
|---|---|
| `src/server.js` | Main server, connects everything |
| `src/routes/auth.js` | Register, login, JWT tokens |
| `src/routes/ai.js` | **All Claude API calls** — API key never leaves here |
| `src/routes/stripe.js` | Checkout, billing portal, payment webhooks |
| `src/routes/campaigns.js` | Save/load pipeline outputs |
| `src/routes/platforms.js` | Platform connect/disconnect |
| `src/routes/user.js` | Profile and usage stats |
| `src/db/migrate.js` | Creates database tables |
| `src/db/seed.js` | Creates test user |
| `src/ai/prompts.js` | AI prompts for every feature |
| `src/middleware/auth.js` | Protects routes, checks plans and credits |

### Frontend

| File | What it does |
|---|---|
| `src/App.jsx` | Routing and auth guard |
| `src/services/api.js` | All API calls to backend (no Anthropic key here) |
| `src/hooks/useAI.js` | Streams AI responses through backend |
| `src/hooks/useAuth.jsx` | Global logged-in state |
| `src/pages/AuthPage.jsx` | Login and register |
| `src/pages/Dashboard.jsx` | Home screen |
| `src/pages/Platforms.jsx` | Connect YouTube/TikTok/Instagram |
| `src/pages/Trends.jsx` | Trend radar |
| `src/pages/FeaturePages.jsx` | Optimizer, Thumbnails, Scripts, Analytics, Pipeline |
| `src/pages/Pricing.jsx` | Stripe subscription checkout |
| `src/pages/Account.jsx` | Profile, billing, usage |

---

## API endpoints

### Auth
```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          (requires token)
```

### AI (all streaming, all require token)
```
POST /api/ai/stream        { feature, context }
GET  /api/ai/credits
```

**Features:**
- `scan_trends` — detect trending topics
- `analyze_trend` — deep-dive on a specific trend
- `optimize_video` — SEO tags, title, description
- `generate_thumbnail` — thumbnail design concepts
- `analyze_thumbnail` — CTR analysis of existing thumbnail
- `generate_script` — full production script
- `analyze_growth` — growth analysis
- `revenue_strategy` — monetization recommendations
- `trend` / `virality` / `idea` / `script` / `thumbnail` / `tags` / `schedule` — pipeline stages

### Campaigns
```
GET    /api/campaigns
POST   /api/campaigns       { name, niche, platform }
GET    /api/campaigns/:id
PATCH  /api/campaigns/:id
DELETE /api/campaigns/:id
POST   /api/campaigns/:id/output   { stage, output }
```

### Platforms
```
GET    /api/platforms
POST   /api/platforms/connect      { platform, handle, access_token, ... }
DELETE /api/platforms/:platform
GET    /api/platforms/:platform/stats
```

### Billing
```
GET  /api/stripe/plans
POST /api/stripe/checkout   { plan }  → redirects to Stripe
POST /api/stripe/portal            → redirects to Stripe billing portal
POST /api/stripe/webhook           → Stripe events (raw body)
```

---

## Deploying to production (when you're ready)

The easiest path:

1. **Railway** (railway.app) — deploy backend with one click, $5/month
2. **Vercel** (vercel.com) — deploy frontend for free
3. **Supabase** (supabase.com) — managed PostgreSQL, free tier

Steps:
1. Push code to GitHub
2. Connect Railway to your GitHub repo → it builds and deploys automatically
3. Set all environment variables in Railway dashboard
4. Connect Vercel to your frontend folder
5. Set `VITE_API_URL` in Vercel to your Railway backend URL
6. Update `FRONTEND_URL` in Railway to your Vercel URL

---

## Common errors and fixes

**`Cannot connect to database`**
- Make sure PostgreSQL is running (Docker: `docker compose up` / Manual: check pgAdmin)
- Check DB_HOST, DB_USER, DB_PASSWORD in `.env`

**`JWT_SECRET is missing`**
- Copy `.env.example` to `.env` and fill in the values

**`AI features return no response`**
- Check your `ANTHROPIC_API_KEY` in `.env`
- Make sure it starts with `sk-ant-`
- Check you have credits at console.anthropic.com

**`Port 5173 already in use`**
- Another process is using that port. Run `npx kill-port 5173` then try again

**`npm install fails`**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` folder and running `npm install` again

---

## Test credentials

After running `npm run seed`:

| Field    | Value                |
|---|---|
| Email    | test@autopilot.io    |
| Password | password123          |
| Plan     | Pro (unlimited AI)   |
