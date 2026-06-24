-- NextAuth required tables
CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS accounts (
  id                  SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL,
  expires        TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255),
  email           VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image           TEXT
);

-- Leads: one row per business scraped
CREATE TABLE IF NOT EXISTS leads (
  id            SERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  place_id      TEXT UNIQUE,           -- Google Place ID for deduplication
  name          TEXT NOT NULL,
  website       TEXT,
  phone         TEXT,
  address       TEXT,
  niche         TEXT,
  city          TEXT DEFAULT 'Calgary',
  google_rating NUMERIC(2,1),
  review_count  INT,
  status        TEXT DEFAULT 'new'     -- new | audited | reviewed | contacted | replied | booked
);

-- Audits: website + SEO health check results
CREATE TABLE IF NOT EXISTS audits (
  id                  SERIAL PRIMARY KEY,
  lead_id             INT REFERENCES leads(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  pagespeed_mobile    INT,
  pagespeed_desktop   INT,
  has_meta_description BOOLEAN,
  has_h1              BOOLEAN,
  has_ssl             BOOLEAN,
  gbp_complete        BOOLEAN,
  raw_json            JSONB         -- store full API responses for later use
);

-- Scores: fit/pain/opportunity breakdown and tier
CREATE TABLE IF NOT EXISTS scores (
  id                SERIAL PRIMARY KEY,
  lead_id           INT REFERENCES leads(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  fit_score         INT,
  pain_score        INT,
  opportunity_score INT,
  total             INT,
  tier              TEXT          -- A | B | C
);

-- Outreach: email drafts, variants, and outcomes
CREATE TABLE IF NOT EXISTS outreach (
  id          SERIAL PRIMARY KEY,
  lead_id     INT REFERENCES leads(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  variant     TEXT DEFAULT 'A',   -- A | B for split testing
  subject     TEXT,
  body        TEXT,
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  replied_at  TIMESTAMPTZ,
  outcome     TEXT DEFAULT 'pending'  -- pending | sent | replied | booked | ghosted
);
