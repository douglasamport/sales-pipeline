export interface Lead {
  id: number;
  name: string;
  website?: string;
  niche: string;
  city?: string;
  status: string;
  user_email: string;
  google_rating?: number;
  review_count?: number;
  categories?: string[];
  starred: boolean;
}

export interface Audit {
  pagespeed_mobile: number | null;
  pagespeed_desktop: number | null;
  has_ssl: boolean;
  has_meta_description: boolean;
  has_h1: boolean;
  has_blog: boolean;
  has_facebook: boolean;
  has_instagram: boolean;
  contact_email: string | null;
  copyright_year: number | null;
  // Ahrefs
  domain_rating: number | null;
  referring_domains: number | null;
  backlinks: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  ahrefs_enriched_at: string | null;
  // Hunter
  hunter_enriched_at: string | null;
  // Scoring
  fit_score: number | null;
  pain_score: number | null;
  opportunity_score: number | null;
  total_score: number | null;
  tier: "A" | "B" | "C" | null;
  ai_summary: string | null;
  fit_explanation: string | null;
  pain_explanation: string | null;
  opportunity_explanation: string | null;
  scored_at: string | null;
  raw_json: any;
}

export interface Contact {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number | null;
  linkedin: string | null;
  source: string;
}
