"use client";

import React, { useEffect, useState } from "react";

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
  // Ahrefs
  domain_rating: number | null;
  referring_domains: number | null;
  backlinks: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  ahrefs_enriched_at: string | null;
  // Hunter
  hunter_enriched_at: string | null;
  // Scoring
  fit_score: number | null;
  pain_score: number | null;
  opportunity_score: number | null;
  total_score: number | null;
  tier: "A" | "B" | "C" | null;
  ai_summary: string | null;
  scored_at: string | null;
  raw_json: any;
}

interface Contact {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number | null;
  linkedin: string | null;
  source: string;
}

function Score({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  const color =
    value >= 70
      ? "text-green-400"
      : value >= 50
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={color}>{value}</span>;
}

function DR({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  const color =
    value >= 20
      ? "text-green-400"
      : value >= 10
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={`font-semibold ${color}`}>{value}</span>;
}

function Num({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  return <span>{value.toLocaleString()}</span>;
}

function Check({ value }: { value: boolean }) {
  return value ? (
    <span className="text-green-400">✓</span>
  ) : (
    <span className="text-red-400">✗</span>
  );
}

export default function AuditPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [audits, setAudits] = useState<Record<number, Audit>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [enriching, setEnriching] = useState<Record<number, boolean>>({});
  const [hunting, setHunting] = useState<Record<number, boolean>>({});
  const [scoring, setScoring] = useState<Record<number, boolean>>({});
  const [contacts, setContacts] = useState<Record<number, Contact[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
      fetch(`/api/audits?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
    ]).then(([leadsData, auditsData]) => {
      console.log(auditsData, "LENGTH");
      setLeads(leadsData.leads ?? []);
      const auditMap: Record<number, Audit> = {};
      for (const audit of auditsData.audits ?? []) {
        auditMap[audit.lead_id] = audit;
      }
      setAudits(auditMap);
    });
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
          prev.map((l) => (l.id === lead.id ? { ...l, status: "audited" } : l)),
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  async function fetchContacts(lead_id: number) {
    const res = await fetch(
      `/api/contacts?lead_id=${lead_id}&t=${Date.now()}`,
      {
        cache: "no-store",
      },
    );
    const data = await res.json();
    setContacts((prev) => ({ ...prev, [lead_id]: data.contacts ?? [] }));
  }

  async function runHunter(lead: Lead) {
    if (!lead.website) return;
    setHunting((prev) => ({ ...prev, [lead.id]: true }));

    console.log(lead.id);
    try {
      const res = await fetch("/api/hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      const data = await res.json();

      console.log(data, "DATA");
      if (!data.error) {
        setAudits((prev) => ({
          ...prev,
          [lead.id]: {
            ...prev[lead.id],
            hunter_enriched_at: new Date().toISOString(),
          },
        }));
        setContacts((prev) => ({ ...prev, [lead.id]: data.contacts ?? [] }));
      }
    } finally {
      setHunting((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  async function runScore(lead: Lead) {
    setScoring((prev) => ({ ...prev, [lead.id]: true }));
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (data.result) {
        setAudits((prev) => ({
          ...prev,
          [lead.id]: {
            ...prev[lead.id],
            fit_score: data.result.fit_score,
            pain_score: data.result.pain_score,
            opportunity_score: data.result.opportunity_score,
            total_score: data.result.total_score,
            tier: data.result.tier,
            ai_summary: data.result.ai_summary,
            scored_at: new Date().toISOString(),
          },
        }));
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: "scored" } : l)),
        );
      }
    } finally {
      setScoring((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  async function runEnrich(lead: Lead) {
    if (!lead.website) return;
    setEnriching((prev) => ({ ...prev, [lead.id]: true }));
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (data.result) {
        setAudits((prev) => ({
          ...prev,
          [lead.id]: {
            ...prev[lead.id],
            domain_rating: data.result.domain_rating,
            referring_domains: data.result.referring_domains,
            backlinks: data.result.backlinks,
            organic_keywords: data.result.organic_keywords,
            organic_traffic: data.result.organic_traffic,
            ahrefs_enriched_at: new Date().toISOString(),
          },
        }));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setEnriching((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  return (
    <div className="max-w-full mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Audit</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
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
              <th className="px-4 py-3 text-center">DR</th>
              <th className="px-4 py-3 text-center">Ref Domains</th>
              <th className="px-4 py-3 text-center">Keywords</th>
              <th className="px-4 py-3 text-center">Traffic</th>
              <th className="px-4 py-3 text-center">Tier</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Audit</th>
              <th className="px-4 py-3 text-center">Enrich</th>
              <th className="px-4 py-3 text-center">Hunter</th>
              <th className="px-4 py-3 text-center">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {leads.map((lead) => {
              const audit = audits[lead.id];
              const isEnriched = !!audit?.ahrefs_enriched_at;
              const isHunted = !!audit?.hunter_enriched_at;
              const isScored = !!audit?.scored_at;
              return (
                <React.Fragment key={lead.id}>
                  <tr
                    className="hover:bg-gray-800/50 transition cursor-pointer"
                    onClick={() => {
                      const next = expanded === lead.id ? null : lead.id;
                      setExpanded(next);
                      if (next && !contacts[lead.id]) fetchContacts(lead.id);
                    }}
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
                    <td className="px-4 py-3 text-center">
                      <Score value={audit?.pagespeed_mobile ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Score value={audit?.pagespeed_desktop ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? <Check value={audit.has_ssl} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? (
                        <Check value={audit.has_meta_description} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? <Check value={audit.has_h1} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? <Check value={audit.has_blog} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? <Check value={audit.has_facebook} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? <Check value={audit.has_instagram} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 truncate max-w-[120px]">
                      {audit?.contact_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DR value={audit?.domain_rating ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Num value={audit?.referring_domains ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Num value={audit?.organic_keywords ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Num value={audit?.organic_traffic ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit?.tier ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-sm ${
                            audit.tier === "A"
                              ? "bg-green-900 text-green-300"
                              : audit.tier === "B"
                                ? "bg-yellow-900 text-yellow-300"
                                : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {audit.tier}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {audit?.total_score != null ? (
                        <span className="text-white font-medium">
                          {audit.total_score}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          lead.status === "scored"
                            ? "bg-green-900 text-green-300"
                            : lead.status === "audited"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.website ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runAudit(lead);
                          }}
                          disabled={loading[lead.id]}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition"
                        >
                          {loading[lead.id]
                            ? "Running..."
                            : audit
                              ? "Re-audit"
                              : "Audit"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">No URL</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit && lead.website ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runEnrich(lead);
                          }}
                          disabled={enriching[lead.id]}
                          className={`px-3 py-1 rounded text-xs transition disabled:opacity-50 ${
                            isEnriched
                              ? "bg-purple-800 hover:bg-purple-700 text-purple-200"
                              : "bg-purple-600 hover:bg-purple-500 text-white"
                          }`}
                        >
                          {enriching[lead.id]
                            ? "Fetching..."
                            : isEnriched
                              ? "Re-enrich"
                              : "Enrich"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">
                          {audit ? "No URL" : "Audit first"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit && lead.website ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runHunter(lead);
                          }}
                          disabled={hunting[lead.id]}
                          className={`px-3 py-1 rounded text-xs transition disabled:opacity-50 ${
                            isHunted
                              ? "bg-orange-800 hover:bg-orange-700 text-orange-200"
                              : "bg-orange-600 hover:bg-orange-500 text-white"
                          }`}
                        >
                          {hunting[lead.id]
                            ? "Hunting..."
                            : isHunted
                              ? "Re-hunt"
                              : "Hunt"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">
                          {audit ? "No URL" : "Audit first"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runScore(lead);
                          }}
                          disabled={scoring[lead.id]}
                          className={`px-3 py-1 rounded text-xs transition disabled:opacity-50 ${
                            isScored
                              ? "bg-green-800 hover:bg-green-700 text-green-200"
                              : "bg-green-600 hover:bg-green-500 text-white"
                          }`}
                        >
                          {scoring[lead.id]
                            ? "Scoring..."
                            : isScored
                              ? "Re-score"
                              : "Score"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">
                          Audit first
                        </span>
                      )}
                    </td>
                  </tr>
                  {expanded === lead.id && audit?.raw_json && (
                    <tr key={`${lead.id}-expanded`} className="bg-gray-800/30">
                      <td colSpan={21} className="px-6 py-4">
                        {audit.scored_at && (
                          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-4 mb-2">
                              <span
                                className={`text-lg font-bold px-3 py-1 rounded ${
                                  audit.tier === "A"
                                    ? "bg-green-900 text-green-300"
                                    : audit.tier === "B"
                                      ? "bg-yellow-900 text-yellow-300"
                                      : "bg-gray-700 text-gray-400"
                                }`}
                              >
                                Tier {audit.tier}
                              </span>
                              <span className="text-xs text-gray-400">
                                Fit:{" "}
                                <span className="text-white">
                                  {audit.fit_score}
                                </span>{" "}
                                · Pain:{" "}
                                <span className="text-white">
                                  {audit.pain_score}
                                </span>{" "}
                                · Opportunity:{" "}
                                <span className="text-white">
                                  {audit.opportunity_score}
                                </span>{" "}
                                · Total:{" "}
                                <span className="text-white font-semibold">
                                  {audit.total_score}
                                </span>
                              </span>
                            </div>
                            {audit.ai_summary && (
                              <p className="text-gray-300 text-xs leading-relaxed">
                                {audit.ai_summary}
                              </p>
                            )}
                          </div>
                        )}
                        {contacts[lead.id] && contacts[lead.id].length > 0 && (
                          <div className="mb-4">
                            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-2">
                              Contacts
                            </p>
                            <table className="w-full text-xs border border-gray-700 rounded">
                              <thead className="bg-gray-800 text-gray-400">
                                <tr>
                                  <th className="px-3 py-2 text-left">Name</th>
                                  <th className="px-3 py-2 text-left">
                                    Position
                                  </th>
                                  <th className="px-3 py-2 text-left">Email</th>
                                  <th className="px-3 py-2 text-center">
                                    Confidence
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    LinkedIn
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                {contacts[lead.id].map((c) => (
                                  <tr
                                    key={c.id}
                                    className="hover:bg-gray-800/50"
                                  >
                                    <td className="px-3 py-2 text-white">
                                      {[c.first_name, c.last_name]
                                        .filter(Boolean)
                                        .join(" ") || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-300">
                                      {c.position ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-blue-400">
                                      {c.email ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {c.confidence !== null ? (
                                        <span
                                          className={
                                            c.confidence >= 80
                                              ? "text-green-400"
                                              : c.confidence >= 50
                                                ? "text-yellow-400"
                                                : "text-red-400"
                                          }
                                        >
                                          {c.confidence}%
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {c.linkedin ? (
                                        <a
                                          href={c.linkedin}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-400 hover:underline"
                                        >
                                          View
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {contacts[lead.id]?.length === 0 &&
                          audit.hunter_enriched_at && (
                            <p className="text-gray-600 text-xs mb-4">
                              No contacts found by Hunter.
                            </p>
                          )}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Content
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_about_page} />{" "}
                              About page
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_testimonials} />{" "}
                              Testimonials
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_cta} /> Clear CTA
                            </p>
                            <p>
                              <Check
                                value={audit.raw_json.has_privacy_policy}
                              />{" "}
                              Privacy policy
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Tech
                            </p>
                            <p>
                              <Check
                                value={audit.raw_json.has_google_analytics}
                              />{" "}
                              Google Analytics
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_chat_widget} />{" "}
                              Chat widget
                            </p>
                            {audit.copyright_year && (
                              <p
                                className={
                                  audit.copyright_year <
                                  new Date().getFullYear() - 1
                                    ? "text-yellow-400"
                                    : ""
                                }
                              >
                                © {audit.copyright_year}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Social
                            </p>
                            <p>
                              <Check value={audit.has_facebook} /> Facebook
                            </p>
                            <p>
                              <Check value={audit.has_instagram} /> Instagram
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_linkedin} />{" "}
                              LinkedIn
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_twitter} />{" "}
                              Twitter/X
                            </p>
                            <p>
                              <Check value={audit.raw_json.has_youtube} />{" "}
                              YouTube
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Contact
                            </p>
                            {audit.contact_email && (
                              <p className="text-blue-400">
                                {audit.contact_email}
                              </p>
                            )}
                            {audit.raw_json.contact_page_url && (
                              <p className="text-gray-300">
                                {audit.raw_json.contact_page_url}
                              </p>
                            )}
                            {audit.raw_json.page_title && (
                              <p className="text-gray-400 italic">
                                "{audit.raw_json.page_title}"
                              </p>
                            )}
                            {audit.raw_json.error && (
                              <p className="text-red-400">
                                {audit.raw_json.error}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Hunter
                            </p>
                            {audit.hunter_enriched_at ? (
                              <>
                                <p className="text-green-400">✓ Enriched</p>
                                <p className="text-gray-600">
                                  {new Date(
                                    audit.hunter_enriched_at,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-gray-400">
                                  {contacts[lead.id]?.length ?? 0} contact(s)
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-600">Not hunted yet</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                              Ahrefs
                            </p>
                            {audit.ahrefs_enriched_at ? (
                              <>
                                <p>
                                  DR:{" "}
                                  <span className="text-white font-semibold">
                                    {audit.domain_rating ?? "—"}
                                  </span>
                                </p>
                                <p>
                                  Ref domains:{" "}
                                  <span className="text-white">
                                    {audit.referring_domains?.toLocaleString() ??
                                      "—"}
                                  </span>
                                </p>
                                <p>
                                  Backlinks:{" "}
                                  <span className="text-white">
                                    {audit.backlinks?.toLocaleString() ?? "—"}
                                  </span>
                                </p>
                                <p>
                                  Keywords:{" "}
                                  <span className="text-white">
                                    {audit.organic_keywords?.toLocaleString() ??
                                      "—"}
                                  </span>
                                </p>
                                <p>
                                  Traffic:{" "}
                                  <span className="text-white">
                                    {audit.organic_traffic?.toLocaleString() ??
                                      "—"}
                                  </span>
                                </p>
                                <p className="text-gray-600 mt-1">
                                  Enriched{" "}
                                  {new Date(
                                    audit.ahrefs_enriched_at,
                                  ).toLocaleDateString()}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-600">Not enriched yet</p>
                            )}
                            {audit.raw_json.ahrefs?.error && (
                              <p className="text-red-400">
                                {audit.raw_json.ahrefs.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
