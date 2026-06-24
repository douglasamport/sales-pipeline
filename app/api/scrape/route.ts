import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { scrapeLeads } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  const { niche, city = "Calgary" } = await req.json();

  if (!niche) {
    return NextResponse.json({ error: "niche is required" }, { status: 400 });
  }

  try {
    // Fetch existing place_ids for this niche to avoid redundant enrichment API calls
    const existing = await sql`
      SELECT place_id FROM leads WHERE niche = ${niche} AND city = ${city}
    `;
    const existingPlaceIds = new Set(existing.map((r: any) => r.place_id));

    const leads = await scrapeLeads(niche, city, existingPlaceIds);

    // Upsert each lead — skip duplicates by place_id
    const results = await Promise.all(
      leads.map(
        (lead) =>
          sql`
          INSERT INTO leads (place_id, name, website, phone, address, niche, city, google_rating, review_count)
          VALUES (
            ${lead.place_id},
            ${lead.name},
            ${lead.website ?? null},
            ${lead.phone ?? null},
            ${lead.address ?? null},
            ${niche},
            ${city},
            ${lead.google_rating ?? null},
            ${lead.review_count ?? null}
          )
          ON CONFLICT (place_id) DO NOTHING
          RETURNING *
        `,
      ),
    );

    const inserted = results.flat();

    return NextResponse.json({
      message: `Scraped ${leads.length} leads, inserted ${inserted.length} new`,
      leads: inserted,
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
