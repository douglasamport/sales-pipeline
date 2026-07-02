import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateOutreachDraft } from "@/lib/outreach";

export const dynamic = "force-dynamic";

// GET /api/outreach?lead_id=X — fetch existing draft
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const rows = await sql`
      SELECT * FROM outreach WHERE lead_id = ${lead_id} ORDER BY created_at DESC LIMIT 1
    `;
    return NextResponse.json(
      { outreach: rows[0] ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/outreach — generate fresh draft
export async function POST(req: Request) {
  try {
    const { lead_id } = await req.json();
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const [leads, audits, contacts] = await Promise.all([
      sql`SELECT * FROM leads WHERE id = ${lead_id}`,
      sql`SELECT * FROM audits WHERE lead_id = ${lead_id}`,
      sql`SELECT * FROM contacts WHERE lead_id = ${lead_id} ORDER BY confidence DESC`,
    ]);

    const lead = leads[0];
    const audit = audits[0];

    if (!lead)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!audit)
      return NextResponse.json(
        { error: "Audit this lead first" },
        { status: 400 },
      );

    const draft = await generateOutreachDraft(lead, audit, contacts);
    if (draft.error)
      return NextResponse.json({ error: draft.error }, { status: 500 });

    // Delete any unsent drafts and insert fresh one
    await sql`DELETE FROM outreach WHERE lead_id = ${lead_id} AND sent_at IS NULL`;

    const rows = await sql`
      INSERT INTO outreach (lead_id, subject, body, variant, outcome)
      VALUES (${lead_id}, ${draft.subject}, ${draft.body}, 'A', 'pending')
      RETURNING *
    `;

    return NextResponse.json({ outreach: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/outreach — save edits to draft
export async function PATCH(req: Request) {
  try {
    const { outreach_id, subject, body } = await req.json();
    if (!outreach_id)
      return NextResponse.json(
        { error: "outreach_id required" },
        { status: 400 },
      );

    await sql`
      UPDATE outreach SET subject = ${subject}, body = ${body} WHERE id = ${outreach_id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
