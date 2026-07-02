export interface ScoreResult {
  fit_score: number;
  pain_score: number;
  opportunity_score: number;
  total_score: number;
  tier: "A" | "B" | "C";
  ai_summary: string;
  error?: string;
}

export async function scoreLead(lead: any, audit: any): Promise<ScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback("ANTHROPIC_API_KEY not set");

  const prompt = `You are scoring local businesses as potential SEO agency clients.

Business: ${lead.name}
Niche: ${lead.niche ?? "unknown"}
Website: ${lead.website ?? "none"}
Google Rating: ${lead.google_rating ?? "unknown"} (${lead.review_count ?? 0} reviews)

Website Audit:
- Mobile PageSpeed: ${audit.pagespeed_mobile ?? "unknown"}/100
- Desktop PageSpeed: ${audit.pagespeed_desktop ?? "unknown"}/100
- SSL: ${audit.has_ssl}
- Meta description: ${audit.has_meta_description}
- H1 tag: ${audit.has_h1}
- Blog: ${audit.has_blog}
- Copyright year: ${audit.copyright_year ?? "unknown"}
- Contact email found: ${audit.contact_email ?? "none"}
- Facebook: ${audit.has_facebook}, Instagram: ${audit.has_instagram}

SEO Metrics (Ahrefs — may be null if not yet enriched):
- Domain Rating: ${audit.domain_rating ?? "unknown"}
- Organic Keywords: ${audit.organic_keywords ?? "unknown"}
- Organic Traffic: ${audit.organic_traffic ?? "unknown"}
- Referring Domains: ${audit.referring_domains ?? "unknown"}

Score on three dimensions (0–100 each):
- fit_score: Is this an ideal SEO client? (local service business, has website, established)
- pain_score: How poor is their current SEO/web presence? Higher = more pain = more need
- opportunity_score: How much room to grow? Low DR + low traffic in a competitive niche = high opportunity

Tier rules: A = total >= 210, B = total 150–209, C = below 150

Write a 2–3 sentence summary of the key opportunity or most glaring pain point for this specific business. Be specific — mention their niche, scores, and what an SEO agency could realistically fix or exploit.

Respond only in valid JSON:
{
  "fit_score": number,
  "pain_score": number,
  "opportunity_score": number,
  "total_score": number,
  "tier": "A" | "B" | "C",
  "ai_summary": "string"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    if (!json.fit_score) return fallback("Invalid response from Claude");

    const total =
      json.total_score ??
      json.fit_score + json.pain_score + json.opportunity_score;

    return {
      fit_score: json.fit_score,
      pain_score: json.pain_score,
      opportunity_score: json.opportunity_score,
      total_score: total,
      tier: json.tier ?? deriveTier(total),
      ai_summary: json.ai_summary ?? "",
    };
  } catch (err: any) {
    return fallback(err.message);
  }
}

function deriveTier(total: number): "A" | "B" | "C" {
  if (total >= 210) return "A";
  if (total >= 150) return "B";
  return "C";
}

function fallback(error: string): ScoreResult {
  return {
    fit_score: 0,
    pain_score: 0,
    opportunity_score: 0,
    total_score: 0,
    tier: "C",
    ai_summary: "",
    error,
  };
}
