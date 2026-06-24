import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const audits = await sql`
      SELECT * FROM audits
    `;
    return NextResponse.json({ audits });
  } catch (err: any) {
    console.error("Audits fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
