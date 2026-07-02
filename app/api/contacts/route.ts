import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");
    if (!lead_id)
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const contacts = await sql`
      SELECT * FROM contacts WHERE lead_id = ${lead_id} ORDER BY confidence DESC
    `;

    return NextResponse.json(
      { contacts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
