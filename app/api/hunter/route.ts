import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { enrichWithHunter } from "@/lib/hunter";

export async function POST(req: Request) {
  console.log("workin");
  try {
    const { lead_id } = await req.json();
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const leads = await sql`SELECT website FROM leads WHERE id = ${lead_id}`;
    const lead = leads[0];
    if (!lead?.website)
      return NextResponse.json(
        { error: "No website for this lead" },
        { status: 400 },
      );

    console.log(leads, "LEADS");
    const { contacts, error } = await enrichWithHunter(lead.website);
    if (error) return NextResponse.json({ error }, { status: 500 });

    // Fresh pull — delete existing hunter contacts first
    await sql`DELETE FROM contacts WHERE lead_id = ${lead_id} AND source = 'hunter'`;

    for (const c of contacts) {
      await sql`
      INSERT INTO contacts (lead_id, email, first_name, last_name, position, confidence, linkedin, source)
      VALUES (${lead_id}, ${c.email}, ${c.first_name}, ${c.last_name}, ${c.position}, ${c.confidence}, ${c.linkedin}, 'hunter')
    `;
    }

    await sql`UPDATE audits SET hunter_enriched_at = NOW() WHERE lead_id = ${lead_id}`;

    return NextResponse.json({ count: contacts.length, contacts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
