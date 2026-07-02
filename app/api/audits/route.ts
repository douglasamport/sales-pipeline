import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("working");
  try {
    const audits = await sql`
      SELECT * FROM audits
    `;

    return NextResponse.json(
      { audits },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err: any) {
    console.error("Audits fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
