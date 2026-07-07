# Smart Link Shortener with Analytics & Rate Limiting

A Bitly-style URL shortener where the interesting work isn't the shortening — it's the **click analytics**, the **abuse protection**, and **making redirects fast**.

Authenticated users create short links (with optional custom alias and expiry), share them, and get a per-account analytics dashboard: clicks over time, device / browser / OS breakdowns, top referrers, and top links. Redirects are served through an in-memory hot-link cache and record each click *fire-and-forget* so the redirect itself stays fast.

> **Assignment:** 01 · Smart Link Shortener with Analytics & Rate Limiting (MERN track).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Testing](#testing)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)
- [What I'd Do With More Time](#what-id-do-with-more-time)

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, Material-UI (MUI) v9, Recharts, React Router v7, Axios |
| Backend    | Node.js, Express 5 (ESM), Mongoose |
| Database   | MongoDB (aggregation pipelines + TTL index) |
| Auth       | JWT access token + rotating opaque refresh token (httpOnly cookie) |
| Rate limit | `express-rate-limit` |
| Security   | Helmet, CORS (credentialed), SHA-256 IP hashing |
| UA parsing | `ua-parser-js` |
| ID gen     | `nanoid` (base62, collision-retry) |
| Tests      | Node's built-in `node:test` runner |

> **Note on the brief:** the track's ground rules suggest NestJS + TypeScript, but Express is listed as an allowed backend. This project is built on **Express in JavaScript (ESM)**. Migrating to TypeScript strict mode is called out in [What I'd Do With More Time](#what-id-do-with-more-time).

---

## Features

Mapped to the assignment's functional requirements:

- ✅ **Custom alias & expiry** — authenticated users create short links; optional custom alias and optional expiry date.
- ✅ **Public redirect endpoint** — `GET /s/:code` records a click event and forwards the user with a `302`.
- ✅ **Per-account dashboard** — total clicks, unique visitors, clicks-over-time chart, top referrers, and device / browser / OS breakdowns, with a `7d / 30d / 90d / all` range filter.
- ✅ **Rate limiting** — link creation (and all API traffic) is throttled per IP; auth endpoints get a stricter limiter.
- ✅ **Friendly failure** — expired or deactivated links return a clean `410 Gone` payload, not a crash.

### The four milestones

| # | Milestone | Status | Where |
|---|-----------|--------|-------|
| 1 | Auth + create/list links (JWT, validation, unique short-code with collision retry) | ✅ | `authController.js`, `shortCode.service.js` |
| 2 | Redirect + click recording (fire-and-forget write, user-agent parsing) | ✅ | `redirect.controller.js`, `click.service.js` |
| 3 | Analytics dashboard (aggregation pipelines → Recharts, range filter) | ✅ | `analytics.controller.js`, `Analytics.jsx` |
| 4 | Rate limiting + TTL + hot-link cache | ✅ | `rateLimit.middleware.js`, `Link.js`, `LruCache.js` |

---

## Architecture

### Short-code generation with collision retry
`createLinkWithUniqueCode()` generates a 7-character `nanoid`. On a MongoDB duplicate-key error (`11000`) it retries up to 5 times before failing. Custom aliases are validated up front and reserve both the `shortCode` and `customAlias` fields so they can't collide with an auto-generated code.

### Fast redirects + fire-and-forget analytics
`GET /s/:code` is optimised for latency:

1. Look up the code in an **in-memory LRU + TTL cache** (`LruCache`) — a hot-link cache.
2. On a miss, read from MongoDB and warm the cache (healthy links only).
3. Reject inactive / expired links with a `410`.
4. Send the `302` redirect **immediately**.
5. Record the click **after** responding (`recordClick(...).catch(...)`) so analytics never block the user.

**Why 302, not 301?** A `301 Permanent` gets cached by the browser, so subsequent clicks never reach the server and no analytics are recorded. A `302 Temporary` makes the browser hit us every time, keeping click counts accurate.

### Click recording & privacy
Each click stores a **SHA-256 hash of the IP** (salted via `IP_HASH_SALT`) — never the raw IP. `ua-parser-js` extracts device type, browser, and OS, with a regex bot-detection pass. Referrers are reduced to their hostname.

### Analytics via aggregation pipelines
The account overview runs a **single `$facet` aggregation** that computes, in one pass over the user's `ClickEvent`s: totals + unique visitors (`$addToSet` on `ipHash`), clicks-over-time (`$dateToString` day buckets), and device / browser / OS / referrer breakdowns. A per-link endpoint (`GET /api/analytics/:id`) runs a parallel set of grouped pipelines for a single link.

### TTL auto-expiry
The `Link` collection has a TTL index on `expiresAt` with `expireAfterSeconds: 0` and a `partialFilterExpression` so only documents that actually set a date are ever expired — links auto-delete without a cron job.

### Auth: access + rotating refresh tokens
- **Access token** — short-lived JWT (`15m` default), sent in the `Authorization: Bearer` header.
- **Refresh token** — opaque random 40-byte token, **hashed (SHA-256) before storage**, delivered as an `httpOnly`, `sameSite=strict` cookie scoped to `/api/auth`.
- **Rotation** — every refresh consumes the presented token and issues a new one; a reused/expired token is rejected and cleared.
- The frontend Axios interceptor transparently refreshes on a `401` and retries the original request once.

---

## Project Structure

```
Smart-Link-Shortener-with-Analytics-and-Rate-Limiting/
├── backend/
│   ├── src/
│   │   ├── config/db.js                  # Mongoose connection
│   │   ├── controllers/                  # auth, link, redirect, analytics
│   │   ├── middleware/                   # auth (JWT), rate limit, errors, ObjectId validation
│   │   ├── models/                       # User, Link (TTL index), ClickEvent
│   │   ├── routes/                       # auth, users, links, analytics, redirect
│   │   ├── services/                     # shortCode, click recording, link cache
│   │   ├── utils/                        # tokenService, LruCache, isValidUrl
│   │   ├── app.js                        # express app + global middleware
│   │   └── server.js                     # bootstrap, routes, graceful shutdown
│   ├── tests/                            # node:test — LruCache, rate limiter, error handler
│   └── .env.example
└── frontend/
    └── src/
        ├── context/AuthContext.jsx       # auth state + axios instance w/ refresh interceptor
        ├── components/                    # ProtectedRoute, AuthLayout
        ├── pages/                         # Login, Register, Dashboard, Analytics
        ├── theme/theme.js                 # MUI dark theme
        └── App.jsx                        # routes
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (ESM + built-in test runner)
- **MongoDB** running locally, or a MongoDB Atlas connection string

### 1. Clone

```bash
git clone <your-repo-url>
cd Smart-Link-Shortener-with-Analytics-and-Rate-Limiting
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit .env — see the table below
npm run dev                 # starts on http://localhost:5000 (nodemon)
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
# optional: create frontend/.env with VITE_API_URL=http://localhost:5000
npm run dev                 # starts on http://localhost:5173
```

Open **http://localhost:5173**, register an account, and start shortening.

### Production builds

```bash
# backend
cd backend && npm start

# frontend
cd frontend && npm run build && npm run preview
```

---

## Environment Variables

Backend (`backend/.env` — copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Toggles secure cookies, log format, and stack traces |
| `PORT` | `5000` | API port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/smart-link-shortener` | MongoDB connection string |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin (credentialed) |
| `JWT_SECRET` | — | **Required.** Secret used to sign access tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access-token lifetime |
| `REFRESH_TOKEN_DAYS` | `7` | Refresh-token / cookie lifetime in days |
| `IP_HASH_SALT` | *(insecure fallback)* | **Set this in production** — salt for hashing visitor IPs |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max API requests per IP per window |
| `LINK_CACHE_TTL_MS` | `60000` | Hot-link cache entry TTL |
| `LINK_CACHE_MAX_SIZE` | `500` | Max entries in the hot-link cache |

Frontend (`frontend/.env`, optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000` | Base URL of the backend API |

> Real secrets live in `.env` (git-ignored). Only `.env.example` is committed.

---

## API Reference

Base URL: `http://localhost:5000`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | – | Register; returns access token, sets refresh cookie |
| `POST` | `/login` | – | Login; returns access token, sets refresh cookie |
| `POST` | `/refresh` | cookie | Rotate refresh token, issue new access token |
| `POST` | `/logout` | cookie | Revoke the current refresh token |

### Links — `/api/links` (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/` | Create a short link (`longUrl`, optional `customAlias`, `expiresAt`) |
| `GET` | `/` | List my links (newest first) |
| `GET` | `/:id` | Get one link I own |
| `PUT` | `/:id` | Update `longUrl` / `customAlias` / `expiresAt` / `isActive` |
| `DELETE` | `/:id` | Delete a link |
| `PATCH` | `/:id/toggle` | Activate / deactivate a link |

### Analytics — `/api/analytics` (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/overview?range=7d\|30d\|90d\|all` | Account-wide analytics (facet aggregation) |
| `GET` | `/:id` | Per-link analytics breakdown |

### Redirect — public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/s/:code` | `302` to the long URL, records a click. `410` if expired/inactive, `404` if unknown |

**Example — create a link**

```bash
curl -X POST http://localhost:5000/api/links \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "longUrl": "https://example.com/some/really/long/path", "customAlias": "promo" }'
```

---

## Data Model

```js
Link {
  ownerId,               // ref User (indexed)
  longUrl,
  shortCode,             // unique index
  customAlias?,          // unique, sparse
  expiresAt?,            // TTL index (partial) → auto-delete
  clicks,                // denormalised counter
  isActive,
  createdAt, updatedAt
}

ClickEvent {
  linkId,                // ref Link  (compound index: linkId + timestamp)
  ipHash,                // SHA-256(ip + salt) — never the raw IP
  referrer,              // hostname, or "Direct"
  deviceType,            // desktop | mobile | tablet | bot | unknown
  browser, os,
  country?,
  timestamp
}

User {
  name, email,           // email unique
  password,              // bcrypt hash
  refreshTokens: [{ tokenHash, expiresAt }]   // hashed, rotated
}
```

---

## Testing

Hard logic is covered with Node's built-in test runner (no extra framework):

```bash
cd backend
npm test
```

Covers:

- **`lruCache.test.js`** — store/expire by TTL (mocked timers), LRU eviction order, delete, hit/miss stats.
- **`rateLimit.middleware.test.js` / `rateLimit.integration.test.js`** — limit resolution and enforcement.
- **`error.middleware.test.js`** — 404 + centralised error handler behaviour.

---

## Design Decisions & Tradeoffs

- **302 over 301** — chose accurate analytics over browser-side caching of the redirect (see [Architecture](#architecture)).
- **Fire-and-forget click writes** — the redirect responds before the click is persisted. Tradeoff: a click write can fail silently (it's logged), but the user is never made to wait on it.
- **Denormalised `clicks` counter on `Link`** — `$inc` on every click gives O(1) reads for list/top-links views instead of counting `ClickEvent`s each time; the `ClickEvent` collection remains the source of truth for detailed breakdowns.
- **In-memory LRU hot-link cache** — simple, dependency-free, and fast for a single instance. Tradeoff: it isn't shared across processes/instances (a `REDIS_URL` slot is reserved for that upgrade).
- **Hashed, rotating refresh tokens in an httpOnly cookie** — refresh tokens are opaque and stored hashed, so a DB leak doesn't expose usable tokens; rotation limits replay. Access tokens stay short-lived.
- **Rate limiting is currently IP-based and global** — `express-rate-limit` guards all `/api` traffic, with a stricter limiter on `/api/auth`. This is simpler than per-user throttling but has the limitations noted below.

### Known limitations

- Rate limiting is **per IP, not per user**, and the global limiter also currently applies to the `/s/:code` redirect path — the brief intends redirects to be *un-throttled* (while logging suspicious bursts). Scoping the limiter to creation-only and keying it by user is the right next step.
- `country` enrichment is modelled but not populated (no geo-IP lookup yet).
- The hot-link cache is per-process; horizontal scaling needs a shared store.

---

## What I'd Do With More Time

- **Migrate to TypeScript (strict mode)** with Zod/DTO validation on every input, to match the track's ground rules.
- **Per-user, creation-scoped rate limiting** and exempt the redirect route from the global limiter.
- **Geo-IP enrichment** to populate `ClickEvent.country`, and a world-map breakdown in the dashboard.
- **Redis** for a shared hot-link cache and distributed rate limiting across instances.
- **Stretch goals**: QR-code generation per link, CSV export of analytics, and password-protected links.
- More end-to-end tests around the redirect + click-recording flow and the analytics aggregation.

---

## Submission

- **Repo:** this repository (mono-repo: `backend/` + `frontend/`).
- **Loom walkthrough:** _add link here_ — a 3–5 min tour of the design decisions.
```
