"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import FilterSortBar from "@/components/FilterSortBar";
import { useFilters } from "../context/filter-context";

const STATUS_OPTIONS = [
  "scored",
  "reviewed",
  "contacted",
  "replied",
  "discussing",
  "booked",
  "discarded",
];

interface Lead {
  id: number;
  name: string;
  website?: string;
  niche: string;
  city?: string;
  status: string;
  starred?: boolean;
  google_rating?: number;
  review_count?: number;
  categories?: string[];
}

interface Audit {
  lead_id: number;
  pagespeed_mobile: number | null;
  pagespeed_desktop: number | null;
  has_ssl: boolean;
  has_meta_description: boolean;
  has_h1: boolean;
  has_blog: boolean;
  has_facebook: boolean;
  has_instagram: boolean;
  contact_email: string | null;
  domain_rating: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  ahrefs_enriched_at: string | null;
  hunter_enriched_at: string | null;
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
  copyright_year: number | null;
}

interface Contact {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number | null;
}

interface Issue {
  label: string;
  severity: "red" | "yellow";
}

function getIssues(audit: Audit): Issue[] {
  const issues: Issue[] = [];
  const year = new Date().getFullYear();

  if (audit.pagespeed_mobile !== null && audit.pagespeed_mobile < 50)
    issues.push({
      label: `Slow mobile (${audit.pagespeed_mobile}/100)`,
      severity: "red",
    });
  else if (audit.pagespeed_mobile !== null && audit.pagespeed_mobile < 70)
    issues.push({
      label: `Mobile needs work (${audit.pagespeed_mobile}/100)`,
      severity: "yellow",
    });

  if (!audit.has_blog)
    issues.push({ label: "No blog content", severity: "red" });
  if (!audit.has_meta_description)
    issues.push({ label: "Missing meta description", severity: "yellow" });
  if (!audit.has_h1) issues.push({ label: "Missing H1", severity: "yellow" });
  if (!audit.has_ssl) issues.push({ label: "No SSL", severity: "red" });

  if (audit.domain_rating !== null && audit.domain_rating < 10)
    issues.push({
      label: `Low domain authority (DR ${audit.domain_rating})`,
      severity: "red",
    });

  if (audit.organic_traffic !== null && audit.organic_traffic < 100)
    issues.push({ label: "Minimal organic traffic", severity: "red" });

  if (audit.copyright_year && audit.copyright_year < year - 1)
    issues.push({
      label: `Outdated site (© ${audit.copyright_year})`,
      severity: "yellow",
    });

  if (!audit.has_facebook && !audit.has_instagram)
    issues.push({ label: "No social media", severity: "yellow" });

  return issues;
}

function speedColor(v: number) {
  if (v >= 70) return "text-green-400";
  if (v >= 50) return "text-yellow-400";
  return "text-red-400";
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [audits, setAudits] = useState<Record<number, Audit>>({});
  const [contacts, setContacts] = useState<Record<number, Contact[]>>({});
  const [acting, setActing] = useState<Record<number, boolean>>({});
  const { filters, setFilters } = useFilters();

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
      fetch(`/api/audits?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
    ]).then(async ([leadsData, auditsData]) => {
      const allLeads: Lead[] = leadsData.leads ?? [];
      const auditMap: Record<number, Audit> = {};
      for (const a of auditsData.audits ?? []) auditMap[a.lead_id] = a;

      setLeads(allLeads);
      setAudits(auditMap);

      const scoredIds = allLeads
        .filter((l) => auditMap[l.id]?.scored_at)
        .map((l) => l.id);

      const contactResults = await Promise.all(
        scoredIds.map((id) =>
          fetch(`/api/contacts?lead_id=${id}&t=${Date.now()}`, {
            cache: "no-store",
          })
            .then((r) => r.json())
            .then((d) => ({ id, contacts: d.contacts ?? [] })),
        ),
      );

      const contactMap: Record<number, Contact[]> = {};
      for (const { id, contacts } of contactResults) contactMap[id] = contacts;
      setContacts(contactMap);
    });
  }, []);

  async function toggleStar(lead_id: number, current: boolean) {
    const next = !current;
    setLeads((prev) => prev.map((l) => l.id === lead_id ? { ...l, starred: next } : l));
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id, action: "starred", value: String(next) }),
    });
  }

  async function doAction(lead_id: number, action: string, value: string) {
    setActing((prev) => ({ ...prev, [lead_id]: true }));
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id, action, value }),
      });

      if (action === "status") {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead_id ? { ...l, status: value } : l)),
        );
      } else if (action === "tier") {
        setAudits((prev) => ({
          ...prev,
          [lead_id]: { ...prev[lead_id], tier: value as "A" | "B" | "C" },
        }));
      }
    } finally {
      setActing((prev) => ({ ...prev, [lead_id]: false }));
    }
  }

  const scored = leads.filter((l) => audits[l.id]?.scored_at);

  const allCategories = Array.from(
    new Set(scored.flatMap((l) => l.categories ?? [])),
  ).sort();

  const allCities = Array.from(
    new Set(scored.map((l) => l.city).filter(Boolean) as string[]),
  ).sort();

  const sorted = scored
    .filter((l) => {
      const audit = audits[l.id];
      if (
        filters.status === "all"
          ? l.status === "discarded"
          : l.status !== filters.status
      )
        return false;
      if (filters.tier !== "all" && (audit?.tier ?? null) !== filters.tier)
        return false;
      if (
        filters.category !== "all" &&
        !l.categories?.includes(filters.category)
      )
        return false;
      if (filters.city !== "all" && l.city !== filters.city) return false;
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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Starred leads strip */}
      {(() => {
        const starred = leads.filter((l) => l.starred && l.status !== "discarded");
        if (starred.length === 0) return null;
        return (
          <div className="mb-6">
            <p className="text-xs text-yellow-500 uppercase tracking-wide mb-2">★ Starred</p>
            <div className="flex flex-wrap gap-2">
              {starred.map((lead) => {
                const audit = audits[lead.id];
                return (
                  <Link
                    key={lead.id}
                    href={`/outreach/${lead.id}`}
                    className="flex items-center gap-2 bg-gray-900 border border-yellow-800/40 hover:border-yellow-600/60 rounded-lg px-3 py-2 transition group"
                  >
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      audit?.tier === "A" ? "bg-green-900 text-green-300"
                      : audit?.tier === "B" ? "bg-yellow-900 text-yellow-300"
                      : "bg-gray-800 text-gray-400"
                    }`}>
                      {audit?.tier ?? "?"}
                    </span>
                    <div>
                      <p className="text-sm text-white group-hover:text-yellow-300 transition leading-tight">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.niche} · {lead.status}</p>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); toggleStar(lead.id, true); }}
                      className="ml-1 text-yellow-400 hover:text-gray-500 transition text-sm"
                      title="Unstar"
                    >
                      ★
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      <FilterSortBar
        filters={filters}
        onChange={setFilters}
        categories={allCategories}
        cities={allCities}
        resultCount={sorted.length}
      />

      {sorted.length === 0 && (
        <div className="text-center text-gray-600 py-20">
          No leads here yet. Score some leads on the Audit page first.
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((lead) => {
          const audit = audits[lead.id];
          const leadContacts = contacts[lead.id] ?? [];
          const issues = getIssues(audit);
          const isActing = acting[lead.id];
          const isDiscarded = lead.status === "discarded";

          const TECH_CHECKS = [
            { label: "SSL", value: audit.has_ssl },
            { label: "Blog", value: audit.has_blog },
            { label: "Meta", value: audit.has_meta_description },
            { label: "H1", value: audit.has_h1 },
            { label: "Facebook", value: audit.has_facebook },
            { label: "Instagram", value: audit.has_instagram },
          ];

          return (
            <div
              key={lead.id}
              className={`bg-gray-900 border rounded-xl p-5 transition ${
                isDiscarded ? "border-gray-800 opacity-50" : "border-gray-800"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold px-2.5 py-1 rounded flex-shrink-0 ${
                      audit.tier === "A"
                        ? "bg-green-900 text-green-300"
                        : audit.tier === "B"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {audit.tier ?? "?"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-white">{lead.name}</h2>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-xs hover:underline"
                        >
                          {lead.website.replace(/^https?:\/\//, "")} ↗
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {lead.niche}
                      {lead.google_rating && (
                        <span className="ml-2">
                          ★ {lead.google_rating}{" "}
                          <span className="text-gray-600">
                            ({lead.review_count} reviews)
                          </span>
                        </span>
                      )}
                    </p>
                    {lead.categories && lead.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded cursor-pointer hover:text-gray-300 transition"
                            onClick={() =>
                              setFilters((f) => ({ ...f, category: cat }))
                            }
                          >
                            {cat.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {audit.fit_score}/{audit.pain_score}/
                    {audit.opportunity_score}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {audit.total_score} pts
                  </span>
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      doAction(lead.id, "status", e.target.value)
                    }
                    disabled={isActing}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metrics row */}
              {audit.ahrefs_enriched_at && (
                <div className="flex flex-wrap gap-4 text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2 mb-3">
                  {audit.domain_rating !== null && (
                    <span>
                      DR{" "}
                      <span className="text-white font-medium">
                        {audit.domain_rating}
                      </span>
                    </span>
                  )}
                  {audit.organic_traffic !== null && (
                    <span>
                      Traffic{" "}
                      <span className="text-white font-medium">
                        {audit.organic_traffic.toLocaleString()}
                      </span>
                    </span>
                  )}
                  {audit.organic_keywords !== null && (
                    <span>
                      Keywords{" "}
                      <span className="text-white font-medium">
                        {audit.organic_keywords.toLocaleString()}
                      </span>
                    </span>
                  )}
                  {audit.pagespeed_mobile !== null && (
                    <span>
                      Mobile{" "}
                      <span
                        className={`font-medium ${speedColor(audit.pagespeed_mobile)}`}
                      >
                        {audit.pagespeed_mobile}
                      </span>
                    </span>
                  )}
                  {audit.pagespeed_desktop !== null && (
                    <span>
                      Desktop{" "}
                      <span
                        className={`font-medium ${speedColor(audit.pagespeed_desktop)}`}
                      >
                        {audit.pagespeed_desktop}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Tech checks */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TECH_CHECKS.map(({ label, value }) => (
                  <span
                    key={label}
                    className={`text-xs px-2 py-0.5 rounded ${
                      value
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/20 text-red-400"
                    }`}
                  >
                    {value ? "✓" : "✗"} {label}
                  </span>
                ))}
              </div>

              {/* Issues */}
              {issues.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {issues.map((issue) => (
                    <span
                      key={issue.label}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        issue.severity === "red"
                          ? "bg-red-900/50 text-red-300"
                          : "bg-yellow-900/50 text-yellow-300"
                      }`}
                    >
                      {issue.severity === "red" ? "🔴" : "🟡"} {issue.label}
                    </span>
                  ))}
                </div>
              )}

              {/* AI Summary + Score explanations */}
              {audit.ai_summary && (
                <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <p className="text-sm text-gray-300 leading-relaxed mb-2">
                    {audit.ai_summary}
                  </p>
                  {(audit.fit_explanation ||
                    audit.pain_explanation ||
                    audit.opportunity_explanation) && (
                    <ul className="space-y-1.5 text-xs">
                      {audit.fit_explanation && (
                        <li>
                          <span className="text-white font-semibold">
                            FIT ({audit.fit_score}/100):{" "}
                          </span>
                          <span className="text-gray-400">
                            {audit.fit_explanation}
                          </span>
                        </li>
                      )}
                      {audit.pain_explanation && (
                        <li>
                          <span className="text-white font-semibold">
                            PAIN ({audit.pain_score}/100):{" "}
                          </span>
                          <span className="text-gray-400">
                            {audit.pain_explanation}
                          </span>
                        </li>
                      )}
                      {audit.opportunity_explanation && (
                        <li>
                          <span className="text-white font-semibold">
                            OPPORTUNITY ({audit.opportunity_score}/100):{" "}
                          </span>
                          <span className="text-gray-400">
                            {audit.opportunity_explanation}
                          </span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Contacts */}
              {leadContacts.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                    Contacts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {leadContacts.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs bg-gray-800 px-2.5 py-1.5 rounded-lg"
                      >
                        <span className="text-white font-medium">
                          {[c.first_name, c.last_name]
                            .filter(Boolean)
                            .join(" ") || "Unknown"}
                        </span>
                        {c.position && (
                          <span className="text-gray-500 ml-1">
                            · {c.position}
                          </span>
                        )}
                        {c.confidence !== null && (
                          <span
                            className={`ml-1 ${c.confidence >= 80 ? "text-green-400" : c.confidence >= 50 ? "text-yellow-400" : "text-red-400"}`}
                          >
                            ({c.confidence}%)
                          </span>
                        )}
                        {c.email && (
                          <div className="text-blue-400 mt-0.5">{c.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                {audit.tier === "A" && (
                  <button
                    onClick={() => doAction(lead.id, "tier", "B")}
                    disabled={isActing}
                    className="bg-yellow-800 hover:bg-yellow-700 disabled:opacity-50 text-yellow-200 text-xs px-3 py-1.5 rounded transition"
                  >
                    → Move to B
                  </button>
                )}
                {!isDiscarded && (
                  <button
                    onClick={() => doAction(lead.id, "status", "discarded")}
                    disabled={isActing}
                    className="bg-gray-800 hover:bg-red-900 disabled:opacity-50 text-gray-400 hover:text-red-300 text-xs px-3 py-1.5 rounded transition"
                  >
                    ✕ Discard
                  </button>
                )}
                {isDiscarded && (
                  <button
                    onClick={() => doAction(lead.id, "status", "scored")}
                    disabled={isActing}
                    className="text-gray-600 hover:text-gray-400 text-xs px-3 py-1.5 rounded transition"
                  >
                    ↩ Restore
                  </button>
                )}
                <div className="ml-auto">
                  <Link
                    href={`/outreach/${lead.id}`}
                    className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition"
                  >
                    Manage Outreach
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
