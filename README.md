# AI-Assisted Sales Pipeline

A full-stack lead generation and outreach tool built for a Calgary SEO agency. The system automates the process of finding local businesses, auditing their web presence, scoring them as potential clients, and drafting personalized cold outreach — all from a single internal dashboard.

---

## What It Does

Most sales pipelines are either entirely manual or rely on basic CRM tools. This one is different: every step from audit to email draft is either automated or AI-assisted, with a human review layer before anything gets sent.

The workflow moves a lead through these stages:

**1. Lead intake → 2. Website audit → 3. SEO enrichment → 4. Contact discovery → 5. AI scoring → 6. Dashboard review → 7. Outreach drafting → 8. Send**

Each stage is a discrete step, triggered manually, so the operator stays in control while the system does the heavy lifting.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Neon (serverless) |
| Auth | NextAuth.js — magic link email login |
| AI | Anthropic Claude API (Haiku + Sonnet 4.6) |
| SEO Data | Ahrefs v3 API |
| Contact Enrichment | Hunter.io domain search API |
| PageSpeed | Google PageSpeed Insights API v5 |
| Email Sending | Resend API (wired, env-gated) |
| Styling | Tailwind CSS |
| Deployment | Vercel-ready |

---

## Features

### Website Auditor (`lib/auditor.ts`)
Runs a parallel audit of any business website — no third-party audit service needed. Checks:
- Mobile and desktop PageSpeed scores (Google Lighthouse via API)
- SSL certificate presence
- Meta description, H1 tag, blog section
- Facebook, Instagram, LinkedIn, Twitter, YouTube presence
- Contact email (scraped from HTML)
- Copyright year (staleness indicator)
- Google Analytics, chat widget, testimonials, CTA detection

All runs in parallel using `Promise.all`. Gracefully handles timeouts and unreachable sites.

### Ahrefs Enrichment (`lib/ahrefs.ts`)
Pulls domain authority and traffic data from Ahrefs v3:
- Domain Rating (DR)
- Referring domains
- Backlinks
- Organic keywords
- Estimated organic traffic

Handles the Ahrefs quirk of returning decimal values for integer fields (`Math.round()` applied at the library layer before any DB write).

### Hunter.io Contact Discovery (`lib/hunter.ts`)
Domain search returns all known email addresses associated with a business. Contacts are stored per-lead with name, title, confidence score, and LinkedIn URL. Previous results are deleted on re-run so the table stays clean.

### AI Scoring (`lib/scorer.ts`)
Uses Claude Haiku to evaluate each lead across three dimensions and produce a tier:
- **Fit score** — Is this an ideal SEO client profile?
- **Pain score** — How poor is their current web/SEO presence?
- **Opportunity score** — How much room is there to grow?

Total score determines tier: **A** (≥ 210), **B** (150–209), **C** (< 150). Each scored lead also gets a 2–3 sentence AI-written summary of the strongest opportunity or most glaring issue — written specifically about that business, not generic.

### Review Dashboard (`app/dashboard/page.tsx`)
Card-based view of all scored leads. Tabs filter by tier (A / B / C / Approved). Each card shows:
- Tier badge and total score (fit / pain / opportunity breakdown)
- Top 3 issues color-coded red/yellow
- AI-generated opportunity summary
- Hunter contacts with email
- One-click approve, discard, downgrade tier, or status change
- Direct link to outreach editor

### Outreach Editor (`app/outreach/[lead_id]/page.tsx`)
Per-lead email editor backed by Claude Sonnet 4.6. The draft prompt is designed to avoid every cold email cliché — no fake signatures, no "leverage" or "synergy", no generic openers. Rules enforced in the prompt: under 200 words, 3 paragraphs, references a specific issue from the audit, low-pressure CTA.

Response format uses a `SUBJECT: / BODY:` delimiter instead of JSON — an intentional design choice after discovering that capable models writing 200-word emails with natural punctuation reliably break `JSON.parse`.

Send functionality is fully wired (Resend API) but gated behind `OUTREACH_SEND_ENABLED=true` in `.env.local` so nothing sends accidentally.

---

## Architecture Notes

### Caching
Next.js 14's Data Cache patches the global `fetch` — including Neon's internal HTTP transport. This caused stale data to persist across requests even with `force-dynamic` and `Cache-Control: no-store` on every route. The fix is applied at the database client level:

```ts
// lib/db/index.ts
export const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: { cache: "no-store" },
});
```

This opts every query out of Next.js caching at the source, rather than fighting it route by route.

### Database Schema
Five tables: `leads`, `audits`, `contacts`, `outreach`, and NextAuth's required auth tables. Scores are merged into the `audits` table (not a separate table) since the relationship is 1:1 and score history isn't needed. The `outreach` table supports variants (A/B) and tracks `sent_at`, `opened_at`, `replied_at`, and `outcome` for future analytics.

### AI Response Parsing
Scoring (Haiku) uses JSON since the output is a small, well-structured object. Outreach (Sonnet) uses delimiter parsing since email bodies contain quotes, newlines, and punctuation that break JSON serialization. Both choices were made after encountering real failures in production.

---

## Environment Variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
EMAIL_SERVER=          # SMTP for magic link auth
EMAIL_FROM=
ANTHROPIC_API_KEY=
AHREFS_API_KEY=
HUNTER_API_KEY=
GOOGLE_PAGESPEED_KEY=  # Optional — avoids rate limiting
RESEND_API_KEY=        # For sending outreach
OUTREACH_FROM_EMAIL=
OUTREACH_SEND_ENABLED= # Set to "true" to enable sends
```

---

## In Progress

An agentic upgrade to the outreach system is currently in development. See [`AGENTIC_OUTREACH_PLAN.md`](./AGENTIC_OUTREACH_PLAN.md) for the full build plan. The upgrade replaces the single-call draft with a 4-step pipeline:

1. Scrape the prospect's About, Services, and Team pages
2. Pull competing domains from Ahrefs to find who outranks them
3. Claude synthesizes the single strongest pitch angle
4. Draft → self-critique pass before the operator sees it

The intent is that every outreach email references something real and specific about the prospect — not a generic "I noticed your website could use some improvements."

---

## Project Structure

```
app/
  api/
    audit/        — runs website audit, stores to audits table
    enrich/       — Ahrefs enrichment
    hunter/       — Hunter.io contact discovery
    score/        — AI scoring via Claude Haiku
    review/       — status and tier updates from dashboard
    outreach/     — draft generation, editing, send
    leads/        — lead CRUD
    audits/       — audit reads
    contacts/     — contact reads
  audit/          — audit management table UI
  dashboard/      — scored lead review cards
  outreach/[id]/  — per-lead email editor
lib/
  auditor.ts      — website audit logic
  ahrefs.ts       — Ahrefs API client
  hunter.ts       — Hunter.io API client
  scorer.ts       — Claude scoring
  outreach.ts     — Claude outreach draft generation
  db/
    index.ts      — Neon client with cache disabled
    schema.sql    — full database schema
components/
  NavBar.tsx
  Providers.tsx   — NextAuth session provider
```
