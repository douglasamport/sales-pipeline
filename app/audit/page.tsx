"use client";

import React, { useEffect, useState } from "react";
import FilterSortBar, {
  FilterSortState,
  DEFAULT_FILTERS,
} from "@/components/FilterSortBar";
import { useFilters } from "../context/filter-context";

interface Lead {
  id: number;
  name: string;
  website?: string;
  niche: string;
  city?: string;
  status: string;
  google_rating?: number;
  review_count?: number;
  categories?: string[];
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
  fit_explanation: string | null;
  pain_explanation: string | null;
  opportunity_explanation: string | null;
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

  const [auditAllProgress, setAuditAllProgress] = useState<{
    running: boolean;
    current: number;
    total: number;
  }>({
    running: false,
    current: 0,
    total: 0,
  });
  const { filters, setFilters } = useFilters();

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
      fetch(`/api/audits?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
    ]).then(([leadsData, auditsData]) => {
      setLeads(leadsData.leads ?? []);
      const auditMap: Record<number, Audit> = {};
      for (const audit of auditsData.audits ?? []) {
        auditMap[audit.lead_id] = audit;
      }
      setAudits(auditMap);
    });
  }, []);

  function exportCSV() {
    const escape = (v: any) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const headers = [
      "Name",
      "Website",
      "Niche",
      "City",
      "Status",
      "Google Rating",
      "Reviews",
      "Categories",
      "Mobile Speed",
      "Desktop Speed",
      "SSL",
      "Meta Desc",
      "H1",
      "Blog",
      "Facebook",
      "Instagram",
      "Contact Email",
      "Domain Rating",
      "Ref Domains",
      "Org Keywords",
      "Org Traffic",
      "Tier",
      "Total Score",
      "Fit",
      "Pain",
      "Opportunity",
      "AI Summary",
    ];

    const rows = visibleLeads.map((lead) => {
      const a = audits[lead.id];
      return [
        lead.name,
        lead.website,
        lead.niche,
        lead.city,
        lead.status,
        lead.google_rating,
        lead.review_count,
        (lead.categories ?? []).join("; "),
        a?.pagespeed_mobile,
        a?.pagespeed_desktop,
        a?.has_ssl,
        a?.has_meta_description,
        a?.has_h1,
        a?.has_blog,
        a?.has_facebook,
        a?.has_instagram,
        a?.contact_email,
        a?.domain_rating,
        a?.referring_domains,
        a?.organic_keywords,
        a?.organic_traffic,
        a?.tier,
        a?.total_score,
        a?.fit_score,
        a?.pain_score,
        a?.opportunity_score,
        a?.ai_summary,
      ]
        .map(escape)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function discard(lead_id: number) {
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id, action: "status", value: "discarded" }),
    });
    setLeads((prev) => prev.filter((l) => l.id !== lead_id));
  }

  async function auditAll(targets: Lead[]) {
    const queue = targets.filter((l) => l.website && !audits[l.id]);
    if (queue.length === 0) return;

    setAuditAllProgress({ running: true, current: 0, total: queue.length });

    for (let i = 0; i < queue.length; i++) {
      const lead = queue[i];
      setAuditAllProgress((p) => ({ ...p, current: i + 1 }));
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
            prev.map((l) =>
              l.id === lead.id ? { ...l, status: "audited" } : l,
            ),
          );
        }
      } catch {
        // skip failed lead, continue queue
      }
    }

    setAuditAllProgress({ running: false, current: 0, total: 0 });
  }

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

    try {
      const res = await fetch("/api/hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      const data = await res.json();
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
            fit_explanation: data.result.fit_explanation,
            pain_explanation: data.result.pain_explanation,
            opportunity_explanation: data.result.opportunity_explanation,
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
      console.warn(e);
    } finally {
      setEnriching((prev) => ({ ...prev, [lead.id]: false }));
    }
  }

  const allCategories = Array.from(
    new Set(leads.flatMap((l) => l.categories ?? [])),
  ).sort();

  const allCities = Array.from(
    new Set(leads.map((l) => l.city).filter(Boolean) as string[]),
  ).sort();

  const visibleLeads = leads
    .filter((lead) => {
      const audit = audits[lead.id];
      if (
        filters.category !== "all" &&
        !lead.categories?.includes(filters.category)
      )
        return false;
      if (filters.city !== "all" && lead.city !== filters.city) return false;
      if (
        filters.status === "all"
          ? lead.status === "discarded"
          : lead.status !== filters.status
      )
        return false;
      if (filters.tier !== "all" && (audit?.tier ?? null) !== filters.tier)
        return false;
      return true;
    })
    .sort((a, b) => {
      const dir = filters.sortDir === "asc" ? 1 : -1;
      switch (filters.sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "google_rating":
          return ((a.google_rating ?? 0) - (b.google_rating ?? 0)) * dir;
        case "review_count":
          return ((a.review_count ?? 0) - (b.review_count ?? 0)) * dir;
        case "total_score":
          return (
            ((audits[a.id]?.total_score ?? 0) -
              (audits[b.id]?.total_score ?? 0)) *
            dir
          );
        default:
          return 0;
      }
    });

  return (
    <div className="max-w-full mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Audit</h1>
        <div className="flex items-center gap-2">
          {auditAllProgress.running ? (
            <span className="text-sm text-gray-400">
              Auditing {auditAllProgress.current} / {auditAllProgress.total}...
            </span>
          ) : (
            (() => {
              const unaudited = visibleLeads.filter(
                (l) => l.website && !audits[l.id],
              );
              return unaudited.length > 0 ? (
                <button
                  onClick={() => auditAll(visibleLeads)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded transition"
                >
                  Audit all ({unaudited.length})
                </button>
              ) : null;
            })()
          )}
          {visibleLeads.length > 0 && (
            <button
              onClick={exportCSV}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-1.5 rounded transition"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>
      <FilterSortBar
        filters={filters}
        onChange={setFilters}
        categories={allCategories}
        cities={allCities}
        resultCount={visibleLeads.length}
      />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs sticky top-0 z-10">
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {visibleLeads.map((lead) => {
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
                    <td className="px-4 py-3">
                      <div className="font-medium">{lead.name}</div>
                      {lead.categories && lead.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded cursor-pointer hover:text-gray-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilters((f) => ({ ...f, category: cat }));
                              }}
                            >
                              {cat.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          discard(lead.id);
                        }}
                        className="text-gray-600 hover:text-red-400 transition text-lg leading-none"
                        title="Discard lead"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  {expanded === lead.id && audit?.raw_json && (
                    <tr key={`${lead.id}-expanded`} className="bg-gray-800/30">
                      <td colSpan={22} className="px-6 py-4">
                        {audit.scored_at && (
                          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3 mb-3">
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
                              <span className="text-xs text-gray-500">
                                Total:{" "}
                                <span className="text-white font-semibold">
                                  {audit.total_score}
                                </span>
                              </span>
                            </div>
                            {audit.ai_summary && (
                              <p className="text-gray-300 text-xs leading-relaxed mb-3">
                                {audit.ai_summary}
                              </p>
                            )}
                            <ul className="space-y-2 text-xs">
                              <li>
                                <span className="text-white font-semibold">
                                  FIT ({audit.fit_score}/100):{" "}
                                </span>
                                <span className="text-gray-300">
                                  {audit.fit_explanation ?? "—"}
                                </span>
                              </li>
                              <li>
                                <span className="text-white font-semibold">
                                  PAIN ({audit.pain_score}/100):{" "}
                                </span>
                                <span className="text-gray-300">
                                  {audit.pain_explanation ?? "—"}
                                </span>
                              </li>
                              <li>
                                <span className="text-white font-semibold">
                                  OPPORTUNITY ({audit.opportunity_score}
                                  /100):{" "}
                                </span>
                                <span className="text-gray-300">
                                  {audit.opportunity_explanation ?? "—"}
                                </span>
                              </li>
                            </ul>
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
                          {lead.categories && lead.categories.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-gray-400 font-medium uppercase tracking-wide mb-2">
                                Categories
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {lead.categories.map((cat) => (
                                  <span
                                    key={cat}
                                    className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                                    onClick={() =>
                                      setFilters((f) => ({
                                        ...f,
                                        category: cat,
                                      }))
                                    }
                                  >
                                    {cat.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
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
        {leads.length > 0 && visibleLeads.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            No leads match this category.{" "}
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-blue-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
