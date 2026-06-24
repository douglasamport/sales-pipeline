const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export interface ScrapedLead {
  place_id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  google_rating?: number;
  review_count?: number;
}

// Fetch one page of results, return leads + next page token
async function fetchPage(query: string, pageToken?: string) {
  const params = new URLSearchParams({
    query,
    key: PLACES_API_KEY!,
    ...(pageToken ? { pagetoken: pageToken } : {}),
  });

  console.log(query, pageToken?.slice(0, 20));

  let data: any;
  try {
    const url = `${BASE_URL}/textsearch/json?${params}`;
    console.log(url);
    var res = await fetch(url);

    if (res.status !== 200 && data.statusText !== "OK") {
      throw new Error(
        `Places API error: ${data.status} — ${data.error_message}`,
      );
    }

    data = await res.json();
  } catch (err) {
    console.error("[scraper] fetchPage error:", err);
    throw err;
  }

  const leads: ScrapedLead[] = (data.results || []).map((place: any) => ({
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    google_rating: place.rating,
    review_count: place.user_ratings_total,
  }));

  return { leads, nextPageToken: data.next_page_token };
}

// Fetch website + phone from Place Details (costs an extra API call per lead)
async function fetchDetails(placeId: string): Promise<Partial<ScrapedLead>> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "website,formatted_phone_number",
    key: PLACES_API_KEY!,
  });

  const res = await fetch(`${BASE_URL}/details/json?${params}`);
  const data = await res.json();

  return {
    website: data.result?.website,
    phone: data.result?.formatted_phone_number,
  };
}

// Main export: scrape a niche in Calgary and return enriched leads
// Pass existingPlaceIds to skip leads already in the DB before enriching
export async function scrapeLeads(
  niche: string,
  city = "Calgary",
  existingPlaceIds: Set<string> = new Set(),
): Promise<ScrapedLead[]> {
  const query = `${niche} in ${city}`;
  const allLeads: ScrapedLead[] = [];
  let pageToken: string | undefined;

  // Google Places Text Search returns up to 60 results across 3 pages
  let pages = 0;

  do {
    const { leads, nextPageToken } = await fetchPage(query, pageToken);
    const newLeads = leads.filter((l) => !existingPlaceIds.has(l.place_id));
    allLeads.push(...newLeads);
    pageToken = nextPageToken;
    pages++;

    if (pageToken) await new Promise((r) => setTimeout(r, 2000));
  } while (pageToken && allLeads.length < 60 && pages < 3);

  // Enrich only new leads with website + phone (avoids wasting API calls on duplicates)
  const enriched = await Promise.all(
    allLeads.map(async (lead) => {
      const details = await fetchDetails(lead.place_id);
      return { ...lead, ...details };
    }),
  );

  return enriched;
}
