const AHREFS_API = "https://api.ahrefs.com/v3";

// Domains to exclude from competitor results — directories and social platforms
const NON_COMPETITOR_DOMAINS = new Set([
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "youtube.com", "yelp.com", "google.com", "tripadvisor.com",
  "yellowpages.com", "bbb.org", "thumbtack.com", "angi.com",
  "homeadvisor.com", "houzz.com", "realtor.com", "zillow.com",
  "wikipedia.org", "reddit.com", "pinterest.com",
]);

export interface AhrefsResult {
  domain_rating: number | null;
  referring_domains: number | null;
  backlinks: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  error?: string;
}

function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function getCompetingDomains(url: string): Promise<string[]> {
  const apiKey = process.env.AHREFS_API_KEY;
  if (!apiKey) return [];

  const domain = extractDomain(url);
  const date = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(
      `${AHREFS_API}/site-explorer/competing-domains?target=${domain}&mode=domain&limit=10&date=${date}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!res.ok) return [];
    const data = await res.json();

    // Ahrefs returns: { competing_domains: [{ domain: string, ... }] }
    const raw: Array<{ domain: string }> = data?.competing_domains ?? [];

    return raw
      .map((r) => r.domain.replace(/^www\./, ""))
      .filter((d) => !NON_COMPETITOR_DOMAINS.has(d))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function enrichWithAhrefs(url: string): Promise<AhrefsResult> {
  const apiKey = process.env.AHREFS_API_KEY;
  if (!apiKey) {
    return {
      domain_rating: null,
      referring_domains: null,
      backlinks: null,
      organic_keywords: null,
      organic_traffic: null,
      error: "AHREFS_API_KEY not set",
    };
  }

  const domain = extractDomain(url);
  const headers = { Authorization: `Bearer ${apiKey}` };
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  console.log(domain, "DOMAIN");

  try {
    const [drRes, metricsRes] = await Promise.all([
      fetch(
        `${AHREFS_API}/site-explorer/domain-rating?target=${domain}&date=${date}`,
        {
          headers,
        },
      ),
      fetch(
        `${AHREFS_API}/site-explorer/metrics?target=${domain}&mode=domain&date=${date}`,
        { headers },
      ),
    ]);

    const [drData, metricsData] = await Promise.all([
      drRes.json(),
      metricsRes.json(),
    ]);

    console.log("Ahrefs DR response:", JSON.stringify(drData));
    console.log("Ahrefs metrics response:", JSON.stringify(metricsData));

    return {
      domain_rating: drData.domain_rating?.domain_rating != null
        ? Math.round(drData.domain_rating.domain_rating) : null,
      referring_domains: metricsData.metrics?.referring_domains != null
        ? Math.round(metricsData.metrics.referring_domains) : null,
      backlinks: metricsData.metrics?.backlinks != null
        ? Math.round(metricsData.metrics.backlinks) : null,
      organic_keywords: metricsData.metrics?.org_keywords != null
        ? Math.round(metricsData.metrics.org_keywords) : null,
      organic_traffic: metricsData.metrics?.org_traffic != null
        ? Math.round(metricsData.metrics.org_traffic) : null,
    };
  } catch (err: any) {
    console.error("Ahrefs error:", err);
    return {
      domain_rating: null,
      referring_domains: null,
      backlinks: null,
      organic_keywords: null,
      organic_traffic: null,
      error: err.message,
    };
  }
}
