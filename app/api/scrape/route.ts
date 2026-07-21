import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { scrapeLeads } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  console.log("WORKING");
  const { niche, city = "Calgary", searchQuery } = await req.json();

  console.log("call data", niche, city, searchQuery);

  if (!niche) {
    return NextResponse.json({ error: "niche is required" }, { status: 400 });
  }

  // Normalize niche to Title Case so "dental" and "Dental" don't create separate buckets
  const normalizedNiche = niche
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const effectiveQuery = searchQuery?.trim() || undefined;

  console.timeLog(normalizedNiche, effectiveQuery);

  try {
    // Fetch existing place_ids for this niche to avoid redundant enrichment API calls
    const existing = await sql`
      SELECT place_id FROM leads WHERE niche = ${normalizedNiche} AND city = ${city}
    `;
    const existingPlaceIds = new Set(existing.map((r: any) => r.place_id));

    console.log("existing count", existingPlaceIds.size);

    const { allLeads, newLeads } = await scrapeLeads(
      normalizedNiche,
      city,
      existingPlaceIds,
      effectiveQuery,
    );

    // Insert new leads (enriched with website, phone, categories)
    // On conflict: update categories so re-scraping keeps them fresh
    const results = await Promise.all(
      newLeads.map(
        (lead) =>
          sql`
          INSERT INTO leads (place_id, name, website, phone, address, niche, city, google_rating, review_count, categories)
          VALUES (
            ${lead.place_id},
            ${lead.name},
            ${lead.website ?? null},
            ${lead.phone ?? null},
            ${lead.address ?? null},
            ${normalizedNiche},
            ${city},
            ${lead.google_rating ?? null},
            ${lead.review_count ?? null},
            ${lead.categories}
          )
          ON CONFLICT (place_id) DO UPDATE SET categories = EXCLUDED.categories
          RETURNING *, (xmax = 0) AS is_new
        `,
      ),
    );

    const allResults = results.flat();
    const inserted = allResults.filter((r: any) => r.is_new);

    // Log the search
    await sql`
      INSERT INTO search_logs (niche, search_query, city, leads_found, leads_inserted, status)
      VALUES (
        ${normalizedNiche},
        ${effectiveQuery ?? null},
        ${city},
        ${allLeads.length},
        ${inserted.length},
        'success'
      )
    `;

    const searchLabel = effectiveQuery
      ? `"${effectiveQuery}"`
      : normalizedNiche;

    return NextResponse.json({
      message: `Searched for ${searchLabel} in ${city} — ${allLeads.length} found, ${inserted.length} new`,
      leads: inserted,
    });
  } catch (err: any) {
    console.error("Scrape error:", err);

    // Log the failure too
    try {
      await sql`
        INSERT INTO search_logs (niche, search_query, city, leads_found, leads_inserted, status, error_message)
        VALUES (
          ${normalizedNiche},
          ${effectiveQuery ?? null},
          ${city},
          0,
          0,
          'error',
          ${err.message}
        )
      `;
    } catch (_) {
      // Don't let logging failure mask the real error
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
