"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const STEPS = [
  {
    type: "initial" as const,
    label: "Initial Email",
    hint: "First cold outreach",
  },
  {
    type: "follow_up_1" as const,
    label: "Follow-up 1",
    hint: "Send ~3 days after initial",
  },
  {
    type: "follow_up_2" as const,
    label: "Follow-up 2",
    hint: "Final touch, ~7 days after follow-up 1",
  },
];

type StepType = "initial" | "follow_up_1" | "follow_up_2";

interface Lead {
  id: number;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  niche: string;
  status: string;
  starred?: boolean;
  google_rating?: number;
  review_count?: number;
  categories?: string[];
}

interface Audit {
  tier: "A" | "B" | "C" | null;
  total_score: number | null;
  fit_score: number | null;
  pain_score: number | null;
  opportunity_score: number | null;
  fit_explanation: string | null;
  pain_explanation: string | null;
  opportunity_explanation: string | null;
  ai_summary: string | null;
  // Tech
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
  organic_keywords: number | null;
  organic_traffic: number | null;
  ahrefs_enriched_at: string | null;
  // Hunter
  hunter_enriched_at: string | null;
  scored_at: string | null;
  // Agentic research
  site_text: string | null;
  top_competitors: string[] | null;
}

interface Contact {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number | null;
}

interface OutreachRecord {
  id: number;
  type: StepType;
  subject: string;
  body: string;
  sent_at: string | null;
  replied_at: string | null;
  outcome: string;
}

type RecordMap = Record<StepType, OutreachRecord | null>;
type DraftMap = Record<StepType, { subject: string; body: string }>;

const EMPTY_DRAFTS: DraftMap = {
  initial: { subject: "", body: "" },
  follow_up_1: { subject: "", body: "" },
  follow_up_2: { subject: "", body: "" },
};

export default function OutreachPage() {
  const { lead_id } = useParams<{ lead_id: string }>();

  const [lead, setLead] = useState<Lead | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [records, setRecords] = useState<RecordMap>({
    initial: null,
    follow_up_1: null,
    follow_up_2: null,
  });
  const [drafts, setDrafts] = useState<DraftMap>(EMPTY_DRAFTS);
  const [toEmail, setToEmail] = useState("");
  const [expanded, setExpanded] = useState<StepType>("initial");
  const [showDetails, setShowDetails] = useState(false);
  const [starring, setStarring] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<StepType, string>>({
    initial: "", follow_up_1: "", follow_up_2: "",
  });
  const [generating, setGenerating] = useState<StepType | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [saving, setSaving] = useState<StepType | null>(null);
  const [marking, setMarking] = useState<StepType | null>(null);
  const [replying, setReplying] = useState<StepType | null>(null);
  const [saved, setSaved] = useState<StepType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fake progress labels while generating
  useEffect(() => {
    if (!generating) { setProgressLabel(""); return; }
    const steps =
      generating === "initial"
        ? ["Researching website...", "Finding competitors...", "Picking best angle...", "Writing draft...", "Reviewing draft..."]
        : ["Building on previous email...", "Writing draft...", "Reviewing draft..."];
    let i = 0;
    setProgressLabel(steps[0]);
    const timer = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setProgressLabel(steps[i]);
    }, 3500);
    return () => clearInterval(timer);
  }, [generating]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/audits?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/contacts?lead_id=${lead_id}&t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/outreach?lead_id=${lead_id}&t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
    ]).then(([leadsData, auditsData, contactsData, outreachData]) => {
      const id = parseInt(lead_id);
      const foundLead = (leadsData.leads ?? []).find((l: Lead) => l.id === id);
      const foundAudit = (auditsData.audits ?? []).find((a: any) => a.lead_id === id);
      const foundContacts: Contact[] = contactsData.contacts ?? [];
      const outreachRows: OutreachRecord[] = outreachData.outreach ?? [];

      setLead(foundLead ?? null);
      setAudit(foundAudit ?? null);
      setContacts(foundContacts);

      // Build record and draft maps
      const newRecords: RecordMap = { initial: null, follow_up_1: null, follow_up_2: null };
      const newDrafts: DraftMap = { ...EMPTY_DRAFTS };
      for (const row of outreachRows) {
        if (row.type in newRecords) {
          newRecords[row.type] = row;
          newDrafts[row.type] = { subject: row.subject, body: row.body };
        }
      }
      setRecords(newRecords);
      setDrafts(newDrafts);

      // Pre-fill best contact email
      const bestEmail = foundContacts.find((c) => c.email)?.email;
      if (bestEmail) setToEmail(bestEmail);

      // Auto-expand the first unsent step
      const firstUnsent = STEPS.find((s) => !newRecords[s.type]?.sent_at);
      if (firstUnsent) setExpanded(firstUnsent.type);
    });
  }, [lead_id]);

  function isSent(type: StepType) {
    return !!records[type]?.sent_at;
  }

  function isAvailable(type: StepType) {
    if (type === "initial") return true;
    if (type === "follow_up_1") return isSent("initial");
    if (type === "follow_up_2") return isSent("follow_up_1");
    return false;
  }

  function canGenerate(type: StepType) {
    if (type === "initial") return true;
    if (type === "follow_up_1") return !!records.initial;
    if (type === "follow_up_2") return !!records.follow_up_1;
    return false;
  }

  async function generate(type: StepType) {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: parseInt(lead_id),
          type,
          feedback: feedbacks[type] || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRecords((prev) => ({ ...prev, [type]: data.outreach }));
      setDrafts((prev) => ({
        ...prev,
        [type]: { subject: data.outreach.subject, body: data.outreach.body },
      }));
      setFeedbacks((prev) => ({ ...prev, [type]: "" }));
      setSaved(null);
    } finally {
      setGenerating(null);
    }
  }

  async function save(type: StepType) {
    const record = records[type];
    if (!record) return;
    setSaving(type);
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreach_id: record.id,
          subject: drafts[type].subject,
          body: drafts[type].body,
        }),
      });
      setSaved(type);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  async function markSent(type: StepType) {
    const record = records[type];
    if (!record) return;
    setMarking(type);
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_id: record.id, mark_sent: true }),
      });
      const now = new Date().toISOString();
      setRecords((prev) => ({
        ...prev,
        [type]: { ...prev[type]!, sent_at: now, outcome: "sent" },
      }));
      // Expand next step if available
      const idx = STEPS.findIndex((s) => s.type === type);
      if (idx < STEPS.length - 1) setExpanded(STEPS[idx + 1].type);
    } finally {
      setMarking(null);
    }
  }

  async function markReplied(type: StepType) {
    const record = records[type];
    if (!record) return;
    setReplying(type);
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_id: record.id, mark_replied: true }),
      });
      const now = new Date().toISOString();
      setRecords((prev) => ({
        ...prev,
        [type]: { ...prev[type]!, replied_at: now, outcome: "replied" },
      }));
    } finally {
      setReplying(null);
    }
  }

  async function toggleStar() {
    if (!lead) return;
    setStarring(true);
    const next = !lead.starred;
    setLead((prev) => prev ? { ...prev, starred: next } : prev);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: parseInt(lead_id), action: "starred", value: String(next) }),
      });
    } finally {
      setStarring(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      {/* Lead header */}
      {lead && audit && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
          {/* Top bar */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  {audit.tier && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                        audit.tier === "A"
                          ? "bg-green-900 text-green-300"
                          : audit.tier === "B"
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      Tier {audit.tier}
                    </span>
                  )}
                  <h1 className="font-semibold text-white">{lead.name}</h1>
                  {lead.website && (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 text-xs hover:underline">
                      {lead.website.replace(/^https?:\/\//, "")} ↗
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {lead.niche}
                  {lead.city && <span className="text-gray-600"> · {lead.city}</span>}
                  {lead.google_rating && (
                    <span className="ml-2">
                      ★ {lead.google_rating}{" "}
                      <span className="text-gray-600">({lead.review_count} reviews)</span>
                    </span>
                  )}
                  {lead.phone && <span className="ml-2 text-gray-500">{lead.phone}</span>}
                </p>
                {lead.categories && lead.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lead.categories.map((cat) => (
                      <span key={cat} className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                        {cat.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
                {/* Research data indicators */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    audit.site_text
                      ? "border-green-800 bg-green-900/30 text-green-400"
                      : "border-gray-700 bg-gray-800/40 text-gray-600"
                  }`}>
                    {audit.site_text ? "✓" : "✗"} Site scraped
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    audit.top_competitors?.length
                      ? "border-green-800 bg-green-900/30 text-green-400"
                      : "border-gray-700 bg-gray-800/40 text-gray-600"
                  }`}>
                    {audit.top_competitors?.length
                      ? `✓ ${audit.top_competitors.length} competitor${audit.top_competitors.length > 1 ? "s" : ""}`
                      : "✗ No competitors"}
                  </span>
                </div>
              </div>
              {/* Star button */}
              <button
                onClick={toggleStar}
                disabled={starring}
                title={lead.starred ? "Remove from starred" : "Add to starred"}
                className={`text-2xl leading-none flex-shrink-0 transition disabled:opacity-40 ${
                  lead.starred ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-yellow-400"
                }`}
              >
                {lead.starred ? "★" : "☆"}
              </button>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-800 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition"
          >
            <span>Lead details</span>
            <span>{showDetails ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {/* Expanded detail panel */}
          {showDetails && (
            <div className="border-t border-gray-800 p-4 space-y-4">

              {/* AI Summary + Score explanations */}
              {audit.ai_summary && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">AI Analysis</p>
                  <p className="text-xs text-gray-300 leading-relaxed mb-2">{audit.ai_summary}</p>
                  {(audit.fit_explanation || audit.pain_explanation || audit.opportunity_explanation) && (
                    <ul className="space-y-1.5 text-xs">
                      {audit.fit_explanation && (
                        <li>
                          <span className="text-white font-semibold">FIT ({audit.fit_score}/100): </span>
                          <span className="text-gray-400">{audit.fit_explanation}</span>
                        </li>
                      )}
                      {audit.pain_explanation && (
                        <li>
                          <span className="text-white font-semibold">PAIN ({audit.pain_score}/100): </span>
                          <span className="text-gray-400">{audit.pain_explanation}</span>
                        </li>
                      )}
                      {audit.opportunity_explanation && (
                        <li>
                          <span className="text-white font-semibold">OPPORTUNITY ({audit.opportunity_score}/100): </span>
                          <span className="text-gray-400">{audit.opportunity_explanation}</span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Metrics + Tech in two columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* SEO Metrics */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">SEO Metrics</p>
                  <div className="space-y-1 text-xs">
                    {audit.domain_rating !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Domain Rating</span>
                        <span className={audit.domain_rating < 10 ? "text-red-400" : audit.domain_rating < 20 ? "text-yellow-400" : "text-green-400"}>
                          {audit.domain_rating}
                        </span>
                      </div>
                    )}
                    {audit.organic_traffic !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Organic Traffic</span>
                        <span className={audit.organic_traffic < 100 ? "text-red-400" : "text-white"}>
                          {audit.organic_traffic.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {audit.organic_keywords !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Keywords</span>
                        <span className="text-white">{audit.organic_keywords.toLocaleString()}</span>
                      </div>
                    )}
                    {audit.referring_domains !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ref Domains</span>
                        <span className="text-white">{audit.referring_domains.toLocaleString()}</span>
                      </div>
                    )}
                    {audit.pagespeed_mobile !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mobile Speed</span>
                        <span className={audit.pagespeed_mobile < 50 ? "text-red-400" : audit.pagespeed_mobile < 70 ? "text-yellow-400" : "text-green-400"}>
                          {audit.pagespeed_mobile}/100
                        </span>
                      </div>
                    )}
                    {audit.pagespeed_desktop !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Desktop Speed</span>
                        <span className={audit.pagespeed_desktop < 50 ? "text-red-400" : audit.pagespeed_desktop < 70 ? "text-yellow-400" : "text-green-400"}>
                          {audit.pagespeed_desktop}/100
                        </span>
                      </div>
                    )}
                    {audit.copyright_year && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Copyright</span>
                        <span className={audit.copyright_year < new Date().getFullYear() - 1 ? "text-yellow-400" : "text-white"}>
                          © {audit.copyright_year}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tech checks */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Site Checks</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { label: "SSL", value: audit.has_ssl },
                      { label: "Blog", value: audit.has_blog },
                      { label: "Meta Description", value: audit.has_meta_description },
                      { label: "H1 Tag", value: audit.has_h1 },
                      { label: "Facebook", value: audit.has_facebook },
                      { label: "Instagram", value: audit.has_instagram },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className={value ? "text-green-400" : "text-red-400"}>
                          {value ? "✓" : "✗"}
                        </span>
                      </div>
                    ))}
                    {audit.contact_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Site Email</span>
                        <span className="text-blue-400 truncate ml-2 max-w-[140px]">{audit.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contacts */}
      {contacts.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Send to</p>
          <div className="flex flex-wrap gap-2">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => c.email && setToEmail(c.email)}
                className={`text-xs px-3 py-1.5 rounded border transition ${
                  toEmail === c.email
                    ? "border-blue-600 bg-blue-900/30 text-blue-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                {c.position && <span className="text-gray-600"> · {c.position}</span>}
                {c.email && <span className="ml-1 text-blue-400">{c.email}</span>}
                {c.confidence !== null && (
                  <span className={`ml-1 ${c.confidence >= 80 ? "text-green-400" : c.confidence >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {c.confidence}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : audit?.hunter_enriched_at ? (
        <div className="mb-5 flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 text-xs rounded-lg px-4 py-3">
          <span>⚠</span>
          <span>Hunter ran on this lead but found no contacts. You&apos;ll need to find a contact email manually before sending.</span>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Sequence */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const record = records[step.type];
          const sent = isSent(step.type);
          const available = isAvailable(step.type);
          const isOpen = expanded === step.type;
          const draft = drafts[step.type];
          const isGenerating = generating === step.type;

          return (
            <div
              key={step.type}
              className={`bg-gray-900 border rounded-xl overflow-hidden transition ${
                !available ? "opacity-40" : "border-gray-800"
              }`}
            >
              {/* Card header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => available && setExpanded(isOpen ? ("" as StepType) : step.type)}
                disabled={!available}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      sent
                        ? "bg-green-800 text-green-200"
                        : record
                          ? "bg-blue-900 text-blue-300"
                          : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {sent ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{step.label}</p>
                    <p className="text-xs text-gray-500">{step.hint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!available && (
                    <span className="text-xs text-gray-600">🔒 Send previous step first</span>
                  )}
                  {record?.outcome === "replied" && (
                    <span className="text-xs text-emerald-400 font-medium">💬 Reply received</span>
                  )}
                  {sent && record?.outcome !== "replied" && (
                    <span className="text-xs text-green-400">
                      ✓ Sent {new Date(record!.sent_at!).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {!sent && record && (
                    <span className="text-xs text-yellow-500">Draft</span>
                  )}
                  {available && (
                    <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                  )}
                </div>
              </button>

              {/* Editor */}
              {isOpen && available && (
                <div className="border-t border-gray-800">
                  {/* Generate bar */}
                  <div className="border-b border-gray-800 bg-gray-800/30">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-gray-500">
                        {!canGenerate(step.type)
                          ? "Generate the previous step's draft first"
                          : record
                            ? "Edit below or regenerate"
                            : "No draft yet — click Generate to start"}
                      </span>
                      <button
                        onClick={() => generate(step.type)}
                        disabled={!!generating || !canGenerate(step.type)}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded transition"
                      >
                        {isGenerating ? (progressLabel || "Generating...") : record ? "Regenerate" : "Generate Draft"}
                      </button>
                    </div>
                    {record && !sent && (
                      <div className="flex items-center gap-2 px-4 pb-2.5">
                        <input
                          type="text"
                          value={feedbacks[step.type]}
                          onChange={(e) => setFeedbacks((prev) => ({ ...prev, [step.type]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && !generating && generate(step.type)}
                          placeholder="Feedback for regeneration — e.g. make it shorter, less formal, focus on the blog issue"
                          className="flex-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-600 rounded px-3 py-1.5 outline-none focus:border-blue-600 transition"
                        />
                      </div>
                    )}
                  </div>

                  {(record || isGenerating) && (
                    <>
                      {/* To */}
                      <div className="flex items-center border-b border-gray-800 px-4 py-2">
                        <span className="text-xs text-gray-500 w-14">To:</span>
                        <input
                          type="email"
                          value={toEmail}
                          onChange={(e) => setToEmail(e.target.value)}
                          disabled={sent}
                          placeholder="recipient@example.com"
                          className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
                        />
                      </div>

                      {/* Subject */}
                      <div className="flex items-center border-b border-gray-800 px-4 py-2">
                        <span className="text-xs text-gray-500 w-14">Subject:</span>
                        <input
                          type="text"
                          value={draft.subject}
                          onChange={(e) => {
                            setDrafts((prev) => ({
                              ...prev,
                              [step.type]: { ...prev[step.type], subject: e.target.value },
                            }));
                            setSaved(null);
                          }}
                          disabled={sent}
                          className="flex-1 bg-transparent text-sm text-gray-200 outline-none"
                        />
                      </div>

                      {/* Body */}
                      <textarea
                        value={draft.body}
                        onChange={(e) => {
                          setDrafts((prev) => ({
                            ...prev,
                            [step.type]: { ...prev[step.type], body: e.target.value },
                          }));
                          setSaved(null);
                        }}
                        disabled={sent}
                        rows={step.type === "follow_up_2" ? 6 : 12}
                        placeholder={isGenerating ? (progressLabel || "Generating...") : ""}
                        className="w-full bg-transparent text-sm text-gray-200 outline-none p-4 resize-none placeholder-gray-600"
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-2 border-t border-gray-800 px-4 py-3">
                        {sent ? (
                          <>
                            {record?.outcome === "replied" ? (
                              <span className="text-xs text-emerald-400 font-medium">💬 Reply received</span>
                            ) : (
                              <>
                                <span className="text-xs text-green-400 font-medium">✓ Sent</span>
                                <button
                                  onClick={() => markReplied(step.type)}
                                  disabled={!!replying}
                                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded transition"
                                >
                                  {replying === step.type ? "Saving..." : "💬 Got Reply"}
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => save(step.type)}
                              disabled={!!saving || !record}
                              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded transition"
                            >
                              {saving === step.type
                                ? "Saving..."
                                : saved === step.type
                                  ? "Saved ✓"
                                  : "Save Draft"}
                            </button>
                            <button
                              onClick={() => markSent(step.type)}
                              disabled={!!marking || !record}
                              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded transition"
                              title="Mark this email as sent (after copying and sending manually)"
                            >
                              {marking === step.type ? "Marking..." : "✓ Mark as Sent"}
                            </button>
                          </>
                        )}
                        <span className="ml-auto text-xs text-gray-600">
                          {draft.body.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                    </>
                  )}

                  {!record && !isGenerating && (
                    <div className="text-center text-gray-600 text-sm py-10">
                      Click &quot;Generate Draft&quot; to create this {step.label.toLowerCase()}.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
