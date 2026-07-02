import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { enrichWithAhrefs } from "@/lib/ahrefs";

export async function POST(req: Request) {
  try {
    const { lead_id } = await req.json();

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });
    }

    const leads = await sql`SELECT website FROM leads WHERE id = ${lead_id}`;
    const lead = leads[0];
    if (!lead?.website) {
      return NextResponse.json(
        { error: "No website for this lead" },
        { status: 400 },
      );
    }

    const result = await enrichWithAhrefs(lead.website);

    await sql`
      UPDATE audits SET
        domain_rating      = ${result.domain_rating},
        referring_domains  = ${result.referring_domains},
        backlinks          = ${result.backlinks},
        organic_keywords   = ${result.organic_keywords},
        organic_traffic    = ${result.organic_traffic},
        ahrefs_enriched_at = NOW(),
        raw_json           = raw_json || ${JSON.stringify({ ahrefs: result })}::jsonb
      WHERE lead_id = ${lead_id}
    `;

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("Enrich error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
