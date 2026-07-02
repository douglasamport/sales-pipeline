import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auditLead } from "@/lib/auditor";

export async function POST(req: NextRequest) {
  const { lead_id } = await req.json();

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  // Fetch the lead
  const leads = await sql`SELECT * FROM leads WHERE id = ${lead_id}`;
  const lead = leads[0];

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (!lead.website) {
    return NextResponse.json({ error: "Lead has no website" }, { status: 400 });
  }

  try {
    const result = await auditLead(lead.website);

    console.log(result);

    // Upsert audit — replace if already exists for this lead
    const audit = await sql`
      INSERT INTO audits (
        lead_id, pagespeed_mobile, pagespeed_desktop, has_ssl,
        has_meta_description, has_h1, has_blog, has_facebook,
        has_instagram, contact_email, copyright_year, raw_json
      ) VALUES (
        ${lead_id},
        ${result.pagespeed_mobile},
        ${result.pagespeed_desktop},
        ${result.has_ssl},
        ${result.has_meta_description},
        ${result.has_h1},
        ${result.has_blog},
        ${result.has_facebook},
        ${result.has_instagram},
        ${result.contact_email},
        ${result.copyright_year},
        ${JSON.stringify(result.raw_json)}
      )
      ON CONFLICT (lead_id) DO UPDATE SET
        pagespeed_mobile     = EXCLUDED.pagespeed_mobile,
        pagespeed_desktop    = EXCLUDED.pagespeed_desktop,
        has_ssl              = EXCLUDED.has_ssl,
        has_meta_description = EXCLUDED.has_meta_description,
        has_h1               = EXCLUDED.has_h1,
        has_blog             = EXCLUDED.has_blog,
        has_facebook         = EXCLUDED.has_facebook,
        has_instagram        = EXCLUDED.has_instagram,
        contact_email        = EXCLUDED.contact_email,
        copyright_year       = EXCLUDED.copyright_year,
        raw_json             = EXCLUDED.raw_json,
        created_at           = NOW()
      RETURNING *
    `;

    // Update lead status
    await sql`UPDATE leads SET status = 'audited' WHERE id = ${lead_id}`;
    return NextResponse.json(
      { audit: audit[0] },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err: any) {
    console.error("Audit error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
