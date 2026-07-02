import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { scoreLead } from "@/lib/scorer";

export async function POST(req: Request) {
  try {
    const { lead_id } = await req.json();
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const leads = await sql`SELECT * FROM leads WHERE id = ${lead_id}`;
    const audits = await sql`SELECT * FROM audits WHERE lead_id = ${lead_id}`;
    const lead = leads[0];
    const audit = audits[0];

    if (!lead)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!audit)
      return NextResponse.json(
        { error: "Audit this lead first before scoring" },
        { status: 400 },
      );

    const result = await scoreLead(lead, audit);
    if (result.error)
      return NextResponse.json({ error: result.error }, { status: 500 });

    await sql`
      UPDATE audits SET
        fit_score         = ${result.fit_score},
        pain_score        = ${result.pain_score},
        opportunity_score = ${result.opportunity_score},
        total_score       = ${result.total_score},
        tier              = ${result.tier},
        ai_summary        = ${result.ai_summary},
        scored_at         = NOW()
      WHERE lead_id = ${lead_id}
    `;

    await sql`UPDATE leads SET status = 'scored' WHERE id = ${lead_id}`;

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
