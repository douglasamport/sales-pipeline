"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const TIER_TABS = ["All", "A", "B", "C", "Approved"] as const;
type TierTab = (typeof TIER_TABS)[number];

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
  status: string;
  google_rating?: number;
  review_count?: number;
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

  return issues.slice(0, 3);
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [audits, setAudits] = useState<Record<number, Audit>>({});
  const [contacts, setContacts] = useState<Record<number, Contact[]>>({});
  const [activeTab, setActiveTab] = useState<TierTab>("A");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [acting, setActing] = useState<Record<number, boolean>>({});

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

  const filtered = scored.filter((l) => {
    const audit = audits[l.id];
    const tierMatch =
      activeTab === "All"
        ? true
        : activeTab === "Approved"
          ? l.status === "reviewed"
          : audit?.tier === activeTab;
    const statusMatch =
      statusFilter === "all"
        ? l.status !== "discarded"
        : l.status === statusFilter;
    return tierMatch && statusMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
    const ta = tierOrder[audits[a.id]?.tier ?? "C"] ?? 2;
    const tb = tierOrder[audits[b.id]?.tier ?? "C"] ?? 2;
    if (ta !== tb) return ta - tb;
    return (audits[b.id]?.total_score ?? 0) - (audits[a.id]?.total_score ?? 0);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded px-3 py-1.5"
        >
          <option value="all">All active</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Tier tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TIER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "A" || tab === "B" || tab === "C" ? `Tier ${tab}` : tab}
            <span className="ml-1.5 text-xs text-gray-600">
              {tab === "All"
                ? scored.filter((l) => l.status !== "discarded").length
                : tab === "Approved"
                  ? scored.filter((l) => l.status === "reviewed").length
                  : scored.filter(
                      (l) =>
                        audits[l.id]?.tier === tab && l.status !== "discarded",
                    ).length}
            </span>
          </button>
        ))}
      </div>

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
          const isApproved = lead.status === "reviewed";
          const isDiscarded = lead.status === "discarded";

          return (
            <div
              key={lead.id}
              className={`bg-gray-900 border rounded-xl p-5 transition ${
                isDiscarded
                  ? "border-gray-800 opacity-50"
                  : isApproved
                    ? "border-green-800"
                    : "border-gray-800"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold px-2.5 py-1 rounded ${
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
                    <div className="flex items-center gap-2">
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

              {/* AI Summary */}
              {audit.ai_summary && (
                <p className="text-sm text-gray-300 leading-relaxed mb-3">
                  {audit.ai_summary}
                </p>
              )}

              {/* Contacts */}
              {leadContacts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {leadContacts.slice(0, 2).map((c) => (
                    <span
                      key={c.id}
                      className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded"
                    >
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                      {c.position && ` · ${c.position}`}
                      {c.email && (
                        <span className="text-blue-400 ml-1">{c.email}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                {!isApproved && !isDiscarded && (
                  <button
                    onClick={() => doAction(lead.id, "status", "reviewed")}
                    disabled={isActing}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition"
                  >
                    ✓ Approve
                  </button>
                )}
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
                    Draft Outreach
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
