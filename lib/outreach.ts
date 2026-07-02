export interface OutreachDraft {
  subject: string;
  body: string;
  error?: string;
}

export async function generateOutreachDraft(
  lead: any,
  audit: any,
  contacts: any[],
): Promise<OutreachDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return { subject: "", body: "", error: "ANTHROPIC_API_KEY not set" };

  const bestContact = contacts[0];
  const contactName = bestContact?.first_name ?? null;

  // Derive top issues for context
  const issues: string[] = [];
  if (audit.pagespeed_mobile !== null && audit.pagespeed_mobile < 60)
    issues.push(`slow mobile load speed (${audit.pagespeed_mobile}/100)`);
  if (!audit.has_blog) issues.push("no blog or content strategy");
  if (!audit.has_meta_description) issues.push("missing meta descriptions");
  if (audit.domain_rating !== null && audit.domain_rating < 15)
    issues.push(`low domain authority (DR ${audit.domain_rating})`);
  if (audit.organic_traffic !== null && audit.organic_traffic < 200)
    issues.push("minimal organic search traffic");
  if (
    audit.copyright_year &&
    audit.copyright_year < new Date().getFullYear() - 1
  )
    issues.push(`outdated website (© ${audit.copyright_year})`);

  const issuesList = issues.slice(0, 3).join(", ");

  const prompt = `You are writing a cold outreach email on behalf of a Calgary SEO agency reaching out to a local business.

Target business:
- Name: ${lead.name}
- Niche: ${lead.niche}
- Website: ${lead.website}
- Google Rating: ${lead.google_rating ?? "unknown"} (${lead.review_count ?? 0} reviews)
${contactName ? `- Contact first name: ${contactName}` : ""}

Issues found on their website:
${issuesList || "general SEO improvements needed"}

Write a short, genuine cold email. Rules:
- ${contactName ? `Open with "Hi ${contactName},"` : `Open with "Hi there,"`}
- 3 short paragraphs maximum
- First paragraph: one specific observation about their website or online presence — reference their niche and a specific issue. Do NOT sound like you ran an automated scan. Make it feel like you noticed something while browsing.
- Second paragraph: briefly explain what fixing this typically does for ${lead.niche} businesses in Calgary — be concrete (more calls, ranking for X type of search, etc.)
- Third paragraph: low-pressure CTA — offer a free 15-minute call or a quick look at their rankings, no commitment required
- Sign off with: [Your name] / [Your agency]
- Tone: confident but conversational, not salesy, not template-sounding
- Do NOT use the words "leverage", "synergy", "game-changer", or "reach out"
- Keep total length under 200 words
- Sign off with: [Your name] / [Your agency]
- Do NOT include a signature block — end the email after the closing line

Also write a subject line: short, specific to their business or niche, curiosity-inducing but not clickbait.

Return your response in this exact format with no other text:
SUBJECT: <subject line here>
BODY:
<email body here>`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    const text = data.content?.[0]?.text ?? "";

    const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
    const bodyMatch = text.match(/BODY:\n([\s\S]+)/);

    const subject = subjectMatch?.[1]?.trim() ?? "";
    const body = bodyMatch?.[1]?.trim() ?? "";

    if (!subject || !body)
      return { subject: "", body: "", error: "Invalid response from Claude" };

    return { subject, body };
  } catch (err: any) {
    return { subject: "", body: "", error: err.message };
  }
}
