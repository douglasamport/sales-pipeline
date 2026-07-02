const PAGESPEED_API =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface AuditResult {
  // Core columns
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
  // Raw JSON extras
  raw_json: {
    has_linkedin: boolean;
    has_twitter: boolean;
    has_youtube: boolean;
    has_chat_widget: boolean;
    has_google_analytics: boolean;
    has_privacy_policy: boolean;
    has_about_page: boolean;
    has_testimonials: boolean;
    has_cta: boolean;
    contact_page_url: string | null;
    about_page_url: string | null;
    social_links: string[];
    page_title: string | null;
    error?: string;
  };
}

// Run PageSpeed for mobile and desktop
async function runPageSpeed(url: string) {
  const key = process.env.GOOGLE_PAGESPEED_KEY;
  const keyParam = key ? `&key=${key}` : "";

  try {
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=mobile${keyParam}`),
      fetch(`${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=desktop${keyParam}`),
    ]);

    const [mobile, desktop] = await Promise.all([
      mobileRes.json(),
      desktopRes.json(),
    ]);

    return {
      mobile:
        mobile.lighthouseResult?.categories?.performance?.score != null
          ? Math.round(
              mobile.lighthouseResult.categories.performance.score * 100,
            )
          : null,
      desktop:
        desktop.lighthouseResult?.categories?.performance?.score != null
          ? Math.round(
              desktop.lighthouseResult.categories.performance.score * 100,
            )
          : null,
    };
  } catch {
    return { mobile: null, desktop: null };
  }
}

// Fetch and parse the website HTML
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SalesPipelineBot/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });
    return await res.text();
  } catch {
    return null;
  }
}

// Extract signals from HTML
function parseHtml(html: string, url: string) {
  const lower = html.toLowerCase();

  // Basic SEO
  const has_meta_description =
    /<meta\s[^>]*name=["']description["'][^>]*>/i.test(html);
  const has_h1 = /<h1[\s>]/i.test(html);
  const page_title =
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

  // SSL
  const has_ssl = url.startsWith("https://");

  // Blog detection
  const has_blog =
    /href=["'][^"']*\/(blog|news|articles|insights|posts|updates)[/"']/i.test(
      html,
    );

  // Social media links
  const has_facebook = /facebook\.com\//i.test(html);
  const has_instagram = /instagram\.com\//i.test(html);
  const has_linkedin = /linkedin\.com\//i.test(html);
  const has_twitter = /twitter\.com\/|x\.com\//i.test(html);
  const has_youtube = /youtube\.com\//i.test(html);

  // Collect all social links
  const socialPatterns = [
    /https?:\/\/(www\.)?(facebook|instagram|linkedin|twitter|x|youtube)\.com\/[^\s"'<>]+/gi,
  ];
  const social_links: string[] = [];
  for (const pattern of socialPatterns) {
    const matches = html.match(pattern) ?? [];
    social_links.push(...matches.slice(0, 10));
  }

  // Contact info
  const emailMatch = html.match(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  );
  const contact_email = emailMatch ? emailMatch[0] : null;

  // Page links
  const has_privacy_policy = /privacy.?policy|privacy.?notice/i.test(html);
  const has_about_page =
    /href=["'][^"']*\/(about|about-us|our-story|team)[/"']/i.test(html);
  const has_testimonials =
    /testimonial|reviews|what.our.clients|what.customers/i.test(html);
  const has_cta =
    /get.a.quote|book.a|schedule.a|contact.us|free.consult|get.started/i.test(
      html,
    );
  const has_chat_widget =
    /intercom|drift|tawk|livechat|crisp|freshchat|zendesk/i.test(html);
  const has_google_analytics = /google-analytics|gtag\(|UA-\d|G-[A-Z0-9]/i.test(
    html,
  );

  // Contact and about page URLs
  const contactMatch = html.match(
    /href=["']([^"']*\/(contact|contact-us)[^"']*)['"]/i,
  );
  const contact_page_url = contactMatch ? contactMatch[1] : null;
  const aboutMatch = html.match(
    /href=["']([^"']*\/(about|about-us|our-story|team)[^"']*)['"]/i,
  );
  const about_page_url = aboutMatch ? aboutMatch[1] : null;

  // Copyright year
  const copyrightMatch = html.match(/©\s*(\d{4})|copyright\s*©?\s*(\d{4})/i);
  const copyright_year = copyrightMatch
    ? parseInt(copyrightMatch[1] ?? copyrightMatch[2])
    : null;

  return {
    has_meta_description,
    has_h1,
    has_ssl,
    has_blog,
    has_facebook,
    has_instagram,
    contact_email,
    copyright_year,
    page_title,
    raw: {
      has_linkedin,
      has_twitter,
      has_youtube,
      has_chat_widget,
      has_google_analytics,
      has_privacy_policy,
      has_about_page,
      has_testimonials,
      has_cta,
      contact_page_url,
      about_page_url,
      social_links: Array.from(new Set(social_links)),
      page_title,
    },
  };
}

// Main export
export async function auditLead(url: string): Promise<AuditResult> {
  if (!url) {
    return {
      pagespeed_mobile: null,
      pagespeed_desktop: null,
      has_ssl: false,
      has_meta_description: false,
      has_h1: false,
      has_blog: false,
      has_facebook: false,
      has_instagram: false,
      contact_email: null,
      copyright_year: null,
      raw_json: {
        has_linkedin: false,
        has_twitter: false,
        has_youtube: false,
        has_chat_widget: false,
        has_google_analytics: false,
        has_privacy_policy: false,
        has_about_page: false,
        has_testimonials: false,
        has_cta: false,
        contact_page_url: null,
        about_page_url: null,
        social_links: [],
        page_title: null,
        error: "No website URL",
      },
    };
  }

  // Run PageSpeed and HTML fetch in parallel
  const [speed, html] = await Promise.all([runPageSpeed(url), fetchHtml(url)]);

  if (!html) {
    return {
      pagespeed_mobile: speed.mobile,
      pagespeed_desktop: speed.desktop,
      has_ssl: url.startsWith("https://"),
      has_meta_description: false,
      has_h1: false,
      has_blog: false,
      has_facebook: false,
      has_instagram: false,
      contact_email: null,
      copyright_year: null,
      raw_json: {
        has_linkedin: false,
        has_twitter: false,
        has_youtube: false,
        has_chat_widget: false,
        has_google_analytics: false,
        has_privacy_policy: false,
        has_about_page: false,
        has_testimonials: false,
        has_cta: false,
        contact_page_url: null,
        about_page_url: null,
        social_links: [],
        page_title: null,
        error: "Could not fetch website",
      },
    };
  }

  const parsed = parseHtml(html, url);

  return {
    pagespeed_mobile: speed.mobile,
    pagespeed_desktop: speed.desktop,
    has_ssl: parsed.has_ssl,
    has_meta_description: parsed.has_meta_description,
    has_h1: parsed.has_h1,
    has_blog: parsed.has_blog,
    has_facebook: parsed.has_facebook,
    has_instagram: parsed.has_instagram,
    contact_email: parsed.contact_email,
    copyright_year: parsed.copyright_year,
    raw_json: parsed.raw,
  };
}
