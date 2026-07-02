import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  // Disabled until OUTREACH_SEND_ENABLED=true is set in .env.local
  const sendEnabled = process.env.OUTREACH_SEND_ENABLED === "true";
  if (!sendEnabled) {
    return NextResponse.json(
      { error: "Sending is disabled. Set OUTREACH_SEND_ENABLED=true to enable." },
      { status: 403 },
    );
  }

  try {
    const { outreach_id, to_email } = await req.json();
    if (!outreach_id || !to_email)
      return NextResponse.json(
        { error: "outreach_id and to_email required" },
        { status: 400 },
      );

    const rows = await sql`SELECT * FROM outreach WHERE id = ${outreach_id}`;
    const outreach = rows[0];
    if (!outreach)
      return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
    if (outreach.sent_at)
      return NextResponse.json({ error: "Already sent" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.OUTREACH_FROM_EMAIL ?? "onboarding@resend.dev";
    if (!apiKey)
      return NextResponse.json(
        { error: "RESEND_API_KEY not set" },
        { status: 500 },
      );

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to_email],
        subject: outreach.subject,
        text: outreach.body,
      }),
    });

    const data = await res.json();
    if (data.error)
      return NextResponse.json({ error: data.error.message }, { status: 500 });

    await sql`
      UPDATE outreach SET sent_at = NOW(), outcome = 'sent' WHERE id = ${outreach_id}
    `;
    await sql`
      UPDATE leads SET status = 'contacted' WHERE id = ${outreach.lead_id}
    `;

    return NextResponse.json({ ok: true, email_id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
