const HUNTER_API = "https://api.hunter.io/v2";

export interface HunterContact {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number | null;
  linkedin: string | null;
}

export async function enrichWithHunter(
  website: string,
): Promise<{ contacts: HunterContact[]; error?: string }> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return { contacts: [], error: "HUNTER_API_KEY not set" };

  try {
    const domain = new URL(website).hostname.replace(/^www\./, "");
    const res = await fetch(
      `${HUNTER_API}/domain-search?domain=${domain}&api_key=${apiKey}`,
    );
    const data = await res.json();

    console.log(data, "DATA from hunter");

    const emails: any[] = data.data?.emails ?? [];
    return {
      contacts: emails.map((e) => ({
        email: e.value ?? null,
        first_name: e.first_name ?? null,
        last_name: e.last_name ?? null,
        position: e.position ?? null,
        confidence: e.confidence ?? null,
        linkedin: e.linkedin ?? null,
      })),
    };
  } catch (err: any) {
    return { contacts: [], error: err.message };
  }
}
