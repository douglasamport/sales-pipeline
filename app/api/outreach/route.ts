import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateOutreachDraft } from "@/lib/outreach";

export const dynamic = "force-dynamic";

type OutreachType = "initial" | "follow_up_1" | "follow_up_2";

// GET /api/outreach?lead_id=X — fetch all outreach records for lead
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const rows = await sql`
      SELECT * FROM outreach WHERE lead_id = ${lead_id} ORDER BY created_at ASC
    `;
    return NextResponse.json(
      { outreach: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/outreach — generate fresh draft for a given type
export async function POST(req: Request) {
  try {
    const { lead_id, type = "initial", feedback }: { lead_id: number; type: OutreachType; feedback?: string } = await req.json();
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const [leads, audits, contacts, existingRows] = await Promise.all([
      sql`SELECT * FROM leads WHERE id = ${lead_id}`,
      sql`SELECT * FROM audits WHERE lead_id = ${lead_id}`,
      sql`SELECT * FROM contacts WHERE lead_id = ${lead_id} ORDER BY confidence DESC`,
      sql`SELECT * FROM outreach WHERE lead_id = ${lead_id} ORDER BY created_at ASC`,
    ]);

    const lead = leads[0];
    const audit = audits[0];

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!audit) return NextResponse.json({ error: "Audit this lead first" }, { status: 400 });

    // Build previous drafts context for follow-ups
    const byType: Record<string, any> = {};
    for (const row of existingRows) byType[row.type] = row;

    if (type === "follow_up_1" && !byType["initial"]) {
      return NextResponse.json({ error: "Generate the initial email first" }, { status: 400 });
    }
    if (type === "follow_up_2" && !byType["follow_up_1"]) {
      return NextResponse.json({ error: "Generate Follow-up 1 first" }, { status: 400 });
    }

    const previousDrafts = {
      initial: byType["initial"] ? { subject: byType["initial"].subject, body: byType["initial"].body } : undefined,
      follow_up_1: byType["follow_up_1"] ? { subject: byType["follow_up_1"].subject, body: byType["follow_up_1"].body } : undefined,
    };

    const draft = await generateOutreachDraft(lead, audit, contacts, type, previousDrafts, feedback);
    if (draft.error)
      return NextResponse.json({ error: draft.error }, { status: 500 });

    // Delete any unsent draft of this type and insert fresh
    await sql`DELETE FROM outreach WHERE lead_id = ${lead_id} AND type = ${type} AND sent_at IS NULL`;

    const rows = await sql`
      INSERT INTO outreach (lead_id, type, subject, body, variant, outcome)
      VALUES (${lead_id}, ${type}, ${draft.subject}, ${draft.body}, 'A', 'pending')
      RETURNING *
    `;

    return NextResponse.json({ outreach: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/outreach — save edits OR mark as sent
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { outreach_id, mark_sent } = body;

    if (!outreach_id)
      return NextResponse.json({ error: "outreach_id required" }, { status: 400 });

    if (mark_sent) {
      const rows = await sql`SELECT * FROM outreach WHERE id = ${outreach_id}`;
      const record = rows[0];
      if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await sql`UPDATE outreach SET sent_at = NOW(), outcome = 'sent' WHERE id = ${outreach_id}`;

      if (record.type === "initial") {
        await sql`UPDATE leads SET status = 'contacted' WHERE id = ${record.lead_id}`;
      }

      return NextResponse.json({ ok: true });
    }

    if (body.mark_replied) {
      const rows = await sql`SELECT * FROM outreach WHERE id = ${outreach_id}`;
      const record = rows[0];
      if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await sql`UPDATE outreach SET replied_at = NOW(), outcome = 'replied' WHERE id = ${outreach_id}`;
      await sql`UPDATE leads SET status = 'replied' WHERE id = ${record.lead_id}`;

      return NextResponse.json({ ok: true });
    }

    const { subject, body: emailBody } = body;
    await sql`
      UPDATE outreach SET subject = ${subject}, body = ${emailBody} WHERE id = ${outreach_id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
