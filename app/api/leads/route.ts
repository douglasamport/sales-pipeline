import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leads = await sql`
      SELECT * FROM leads ORDER BY created_at DESC
    `;
    return NextResponse.json(
      { leads },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err: any) {
    console.error("Leads fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
