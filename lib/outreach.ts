export interface OutreachDraft {
  subject: string;
  body: string;
  error?: string;
}

type OutreachType = "initial" | "follow_up_1" | "follow_up_2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildIssuesList(audit: any): string {
  const issues: string[] = [];
  if (audit.pagespeed_mobile !== null && audit.pagespeed_mobile < 60)
    issues.push(`slow mobile load speed (${audit.pagespeed_mobile}/100)`);
  if (!audit.has_blog) issues.push("no blog or content strategy");
  if (!audit.has_meta_description) issues.push("missing meta descriptions");
  if (audit.domain_rating !== null && audit.domain_rating < 15)
    issues.push(`low domain authority (DR ${audit.domain_rating})`);
  if (audit.organic_traffic !== null && audit.organic_traffic < 200)
    issues.push("minimal organic search traffic");
  if (audit.copyright_year && audit.copyright_year < new Date().getFullYear() - 1)
    issues.push(`outdated website (© ${audit.copyright_year})`);
  return issues.slice(0, 3).join(", ");
}

// ─── Claude callers ───────────────────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callHaiku(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_URL, {
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
  return data.content?.[0]?.text?.trim() ?? "";
}

async function callSonnet(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

// ─── Step 1 — Research synthesis (Haiku) ─────────────────────────────────────

async function synthesizeResearch(lead: any, audit: any): Promise<string> {
  if (!audit.site_text) return "";

  const prompt = `You are analyzing a prospect's website content to help write a personalized sales email.

Business: ${lead.name} (${lead.niche ?? "local business"}) in ${lead.city ?? "Calgary"}

Scraped website content:
${audit.site_text}

Write 2–3 sentences summarizing:
- What makes this business unique or what they emphasize
- Their apparent target customer or service focus
- Any visible gaps or missed opportunities on their site (vague messaging, missing services page, no testimonials, etc.)

Be specific. Only reference what's in the content above. No filler phrases.`;

  try {
    return await callHaiku(prompt);
  } catch {
    return "";
  }
}

// ─── Step 2 — Angle selection (Sonnet) ────────────────────────────────────────

async function selectAngle(
  lead: any,
  audit: any,
  synthesis: string,
  competitors: string[],
  issuesList: string,
): Promise<string> {
  const competitorLine =
    competitors.length > 0
      ? `Their top competitors in search results: ${competitors.join(", ")}`
      : "No competitor data available";

  const prompt = `You are selecting the single strongest angle for a cold SEO sales email to a local business.

Business: ${lead.name} (${lead.niche ?? "local business"}) in ${lead.city ?? "Calgary"}

Research summary:
${synthesis || "No website content available — work from SEO metrics only."}

${competitorLine}

Known SEO issues:
${issuesList || "general SEO improvements needed"}

Pick ONE specific angle — the most compelling reason this business needs SEO help right now. Make it concrete and tied to real data or an observation.

Good examples:
- "Their top competitor [domain] is ranking for [niche] searches in [city] while they have zero blog content"
- "Mobile speed of ${audit.pagespeed_mobile ?? "unknown"}/100 means they're losing visitors before the page loads"
- "No meta descriptions means Google is writing their own search listings — often poorly"

Output ONE sentence only. No explanation, no label, no preamble. Just the angle.`;

  try {
    return await callSonnet(prompt);
  } catch {
    return issuesList || "significant SEO gaps that are costing them search visibility";
  }
}

// ─── Step 3 — Draft email (Sonnet) ───────────────────────────────────────────

async function draftEmail(
  lead: any,
  audit: any,
  contacts: any[],
  type: OutreachType,
  angle: string,
  previousDrafts: { initial?: OutreachDraft; follow_up_1?: OutreachDraft },
  feedback?: string,
): Promise<OutreachDraft> {
  const contactName = contacts[0]?.first_name ?? null;
  const greeting = contactName ? `Hi ${contactName},` : "Hi there,";
  const competitors =
    (audit.top_competitors as string[] | null)?.slice(0, 2).join(" and ") ?? null;

  let prompt: string;

  if (type === "initial") {
    prompt = `You are writing a cold outreach email on behalf of a Calgary SEO agency.

Target business:
- Name: ${lead.name}
- Niche: ${lead.niche ?? "local business"}
- Website: ${lead.website}
- City: ${lead.city ?? "Calgary"}
- Google Rating: ${lead.google_rating ?? "unknown"} (${lead.review_count ?? 0} reviews)
${contactName ? `- Contact first name: ${contactName}` : ""}
${competitors ? `- Top competitors in search: ${competitors}` : ""}

The strongest angle for this email:
${angle}

Write a short, genuine cold email. Rules:
- Open with "${greeting}"
- 3 short paragraphs maximum
- First paragraph: use the angle above — one specific, human observation about their online presence. Do NOT sound like you ran an automated scan.
- Second paragraph: explain what fixing this typically does for ${lead.niche ?? "businesses"} in Calgary — be concrete (more calls, ranking for specific searches, etc.)
- Third paragraph: low-pressure CTA — offer a free 15-minute call or a quick look at their rankings, no commitment required
- Sign off with: [Your name] / [Your agency]
- Tone: confident but conversational, not salesy
- Do NOT use "leverage", "synergy", "game-changer", or "reach out"
- Under 200 words total

Write a subject line: short, specific to their business or niche, curiosity-inducing but not clickbait.

Return in this exact format with no other text:
SUBJECT: <subject line here>
BODY:
<email body here>`;
  } else if (type === "follow_up_1") {
    const prev = previousDrafts.initial!;
    prompt = `You are writing a follow-up email for a Calgary SEO agency. Initial email sent 3–4 days ago, no reply.

Previous email:
Subject: ${prev.subject}
Body (first 300 chars): ${prev.body.slice(0, 300)}...

Target business:
- Name: ${lead.name}
- Niche: ${lead.niche ?? "local business"}
- Website: ${lead.website}
${contactName ? `- Contact first name: ${contactName}` : ""}
${competitors ? `- Top competitors in search: ${competitors}` : ""}

Try a different angle from the first email — perhaps mention a local search opportunity, a competitor advantage, or a different framing of the value.

Rules:
- Open with "${greeting}"
- Max 2 short paragraphs, under 100 words total
- Briefly acknowledge the previous email without being pushy
- Same low-pressure CTA — 15-minute call, no commitment
- Sign off with: [Your name] / [Your agency]
- Tone: lighter and briefer than the initial

Write a subject line using "Re:" to thread with the original.

Return in this exact format with no other text:
SUBJECT: <subject line here>
BODY:
<email body here>`;
  } else {
    const prev1 = previousDrafts.initial!;
    const prev2 = previousDrafts.follow_up_1!;
    prompt = `You are writing a final "closing the loop" follow-up for a Calgary SEO agency. Two previous emails, no reply.

Previous emails:
1. Initial: "${prev1.subject}"
2. Follow-up 1: "${prev2.subject}"

Target business:
- Name: ${lead.name}
- Niche: ${lead.niche ?? "local business"}
${contactName ? `- Contact first name: ${contactName}` : ""}

Rules:
- Open with "${greeting}"
- 2–3 sentences maximum, under 60 words
- Warm, no pressure — you're closing the loop, not nagging
- Leave the door open ("feel free to reach out if timing changes")
- Sign off with: [Your name] / [Your agency]

Write a subject line using "Re:" to thread.

Return in this exact format with no other text:
SUBJECT: <subject line here>
BODY:
<email body here>`;
  }

  if (feedback?.trim()) {
    prompt += `\n\nFeedback on a previous draft — take this into account:\n${feedback.trim()}`;
  }

  const text = await callSonnet(prompt);
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\n([\s\S]+)/);
  const subject = subjectMatch?.[1]?.trim() ?? "";
  const body = bodyMatch?.[1]?.trim() ?? "";

  if (!subject || !body) return { subject: "", body: "", error: "Invalid response from Claude" };
  return { subject, body };
}

// ─── Step 4 — Self-critique (Haiku) ──────────────────────────────────────────

async function critiqueAndRefine(draft: OutreachDraft): Promise<OutreachDraft> {
  const prompt = `Review this cold sales email draft:

Subject: ${draft.subject}

Body:
${draft.body}

Check these criteria:
1. Does it sound like a template or generic? (bad)
2. Is it specific to this particular business with a concrete detail? (good)
3. Is it under 200 words? (required)
4. Does it avoid clichés like "leverage", "synergy", "game-changer"? (required)

If it PASSES all criteria, respond with exactly:
PASS

If it FAILS, respond with:
REWRITE
SUBJECT: <improved subject>
BODY:
<improved body>

No preamble, no explanation — just PASS or REWRITE + the improved version.`;

  try {
    const response = await callHaiku(prompt);

    if (response.startsWith("PASS")) return draft;

    if (response.startsWith("REWRITE")) {
      const subjectMatch = response.match(/SUBJECT:\s*(.+)/);
      const bodyMatch = response.match(/BODY:\n([\s\S]+)/);
      const subject = subjectMatch?.[1]?.trim();
      const body = bodyMatch?.[1]?.trim();
      if (subject && body) return { subject, body };
    }

    return draft; // If critique output is unparseable, use original
  } catch {
    return draft;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateOutreachDraft(
  lead: any,
  audit: any,
  contacts: any[],
  type: OutreachType = "initial",
  previousDrafts: { initial?: OutreachDraft; follow_up_1?: OutreachDraft } = {},
  feedback?: string,
): Promise<OutreachDraft> {
  try {
    const issuesList = buildIssuesList(audit);
    const competitors = (audit.top_competitors as string[] | null) ?? [];

    // For follow-ups, skip research and go straight to draft
    if (type !== "initial") {
      const draft = await draftEmail(lead, audit, contacts, type, issuesList, previousDrafts, feedback);
      if (draft.error) return draft;
      return await critiqueAndRefine(draft);
    }

    // Initial email — run 4-step pipeline
    // Steps 1 & 2 run in parallel (synthesis doesn't depend on angle)
    const synthesis = await synthesizeResearch(lead, audit);
    const angle = await selectAngle(lead, audit, synthesis, competitors, issuesList);

    const draft = await draftEmail(lead, audit, contacts, type, angle, previousDrafts, feedback);
    if (draft.error) return draft;

    return await critiqueAndRefine(draft);
  } catch (err: any) {
    return { subject: "", body: "", error: err.message };
  }
}
