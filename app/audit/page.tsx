"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: number;
  name: string;
  website?: string;
  niche: string;
  status: string;
  google_rating?: number;
  review_count?: number;
}

interface Audit {
  pagespeed_mobile: number | null;
  pagespeed_desktop: number | null;
  has_ssl: boolean;
  has_meta_description: boolean;
  has_h1: boolean;
  has_blog: boolean;
  has_facebook: boolean;
  has_instagram: boolean;
  contact_email: string | null;
  copyright_year: number | null;
  raw_json: any;
}

function Score({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  const color = value >= 70 ? "text-green-400" : value >= 50 ? "text-yellow-400" : "text-red-400";
  return <span className={color}>{value}</span>;
}

function Check({ value }: { value: boolean }) {
  return value
    ? <span className="text-green-400">✓</span>
    : <span className="text-red-400">✗</span>;
}

export default function AuditPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [audits, setAudits] = useState<Record<number, Audit>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => setLeads(data.leads ?? []));
  }, []);

  async function runAudit(lead: Lead) {
    if (!lead.website) return;
    setLoading((prev) => ({ ...prev, [lead.id]: true }));

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (data.audit) {
        setAudits((prev) => ({ ...prev, [lead.id]: data.audit }));
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: "audited" } : l))
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Business</th>
              <th className="px-4 py-3 text-left">Website</th>
              <th className="px-4 py-3 text-center">Mobile</th>
              <th className="px-4 py-3 text-center">Desktop</th>
              <th className="px-4 py-3 text-center">SSL</th>
              <th className="px-4 py-3 text-center">Meta</th>
              <th className="px-4 py-3 text-center">H1</th>
              <th className="px-4 py-3 text-center">Blog</th>
              <th className="px-4 py-3 text-center">FB</th>
              <th className="px-4 py-3 text-center">IG</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {leads.map((lead) => {
              const audit = audits[lead.id];
              return (
                <>
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-800/50 transition cursor-pointer"
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  >
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3">
                      {lead.website ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:underline truncate block max-w-[140px]"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-gray-600">No website</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center"><Score value={audit?.pagespeed_mobile ?? null} /></td>
                    <td className="px-4 py-3 text-center"><Score value={audit?.pagespeed_desktop ?? null} /></td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_ssl} /> : "—"}</td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_meta_description} /> : "—"}</td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_h1} /> : "—"}</td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_blog} /> : "—"}</td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_facebook} /> : "—"}</td>
                    <td className="px-4 py-3 text-center">{audit ? <Check value={audit.has_instagram} /> : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-300 truncate max-w-[120px]">
                      {audit?.contact_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        lead.status === "audited" ? "bg-blue-900 text-blue-300" : "bg-gray-800 text-gray-400"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.website ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); runAudit(lead); }}
                          disabled={loading[lead.id]}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition"
                        >
                          {loading[lead.id] ? "Running..." : audit ? "Re-audit" : "Audit"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">No URL</span>
                      )}
                    </td>
                  </tr>
                  {expanded === lead.id && audit?.raw_json && (
                    <tr key={`${lead.id}-expanded`} className="bg-gray-800/30">
                      <td colSpan={13} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">Content</p>
                            <p><Check value={audit.raw_json.has_about_page} /> About page</p>
                            <p><Check value={audit.raw_json.has_testimonials} /> Testimonials</p>
                            <p><Check value={audit.raw_json.has_cta} /> Clear CTA</p>
                            <p><Check value={audit.raw_json.has_privacy_policy} /> Privacy policy</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">Tech</p>
                            <p><Check value={audit.raw_json.has_google_analytics} /> Google Analytics</p>
                            <p><Check value={audit.raw_json.has_chat_widget} /> Chat widget</p>
                            {audit.copyright_year && (
                              <p className={audit.copyright_year < new Date().getFullYear() - 1 ? "text-yellow-400" : ""}>
                                © {audit.copyright_year}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">Social</p>
                            <p><Check value={audit.has_facebook} /> Facebook</p>
                            <p><Check value={audit.has_instagram} /> Instagram</p>
                            <p><Check value={audit.raw_json.has_linkedin} /> LinkedIn</p>
                            <p><Check value={audit.raw_json.has_twitter} /> Twitter/X</p>
                            <p><Check value={audit.raw_json.has_youtube} /> YouTube</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">Contact</p>
                            {audit.contact_email && <p className="text-blue-400">{audit.contact_email}</p>}
                            {audit.raw_json.contact_page_url && (
                              <p className="text-gray-300">{audit.raw_json.contact_page_url}</p>
                            )}
                            {audit.raw_json.page_title && (
                              <p className="text-gray-400 italic">"{audit.raw_json.page_title}"</p>
                            )}
                            {audit.raw_json.error && (
                              <p className="text-red-400">{audit.raw_json.error}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            No leads yet. Go to the Leads page to scrape some first.
          </div>
        )}
      </div>
    </div>
  );
}
