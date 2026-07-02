import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { lead_id, action, value } = await req.json();
    if (!lead_id || !action)
      return NextResponse.json(
        { error: "lead_id and action required" },
        { status: 400 },
      );

    if (action === "status") {
      await sql`UPDATE leads SET status = ${value} WHERE id = ${lead_id}`;
    } else if (action === "tier") {
      await sql`UPDATE audits SET tier = ${value} WHERE lead_id = ${lead_id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
