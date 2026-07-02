"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  tier: "A" | "B" | "C" | null;
  total_score: number | null;
  ai_summary: string | null;
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
  subject: string;
  body: string;
  sent_at: string | null;
  outcome: string;
}

export default function OutreachPage() {
  const { lead_id } = useParams<{ lead_id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [outreach, setOutreach] = useState<OutreachRecord | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toEmail, setToEmail] = useState("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/audits?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/contacts?lead_id=${lead_id}&t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/outreach?lead_id=${lead_id}&t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
    ]).then(([leadsData, auditsData, contactsData, outreachData]) => {
      const foundLead = (leadsData.leads ?? []).find(
        (l: Lead) => l.id === parseInt(lead_id),
      );
      const foundAudit = (auditsData.audits ?? []).find(
        (a: any) => a.lead_id === parseInt(lead_id),
      );
      const foundContacts: Contact[] = contactsData.contacts ?? [];

      setLead(foundLead ?? null);
      setAudit(foundAudit ?? null);
      setContacts(foundContacts);

      if (outreachData.outreach) {
        const o = outreachData.outreach;
        setOutreach(o);
        setSubject(o.subject);
        setBody(o.body);
      }

      // Pre-fill best contact email
      if (foundContacts.length > 0 && foundContacts[0].email) {
        setToEmail(foundContacts[0].email);
      }
    });
  }, [lead_id]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: parseInt(lead_id) }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setOutreach(data.outreach);
      setSubject(data.outreach.subject);
      setBody(data.outreach.body);
      setSaved(false);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!outreach) return;
    setSaving(true);
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_id: outreach.id, subject, body }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    // Send is disabled — OUTREACH_SEND_ENABLED controls this server-side
    if (!outreach || !toEmail) return;
    const res = await fetch("/api/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreach_id: outreach.id, to_email: toEmail }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setOutreach((prev) => prev ? { ...prev, sent_at: new Date().toISOString(), outcome: "sent" } : prev);
  }

  const isSent = !!outreach?.sent_at;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      {/* Lead summary */}
      {lead && audit && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {audit.tier && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
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
                  <span className="text-gray-600">({lead.review_count} reviews)</span>
                </span>
              )}
              {audit.total_score && (
                <span className="ml-2 text-gray-600">{audit.total_score} pts</span>
              )}
            </p>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition"
          >
            {generating
              ? "Generating..."
              : outreach
              ? "Regenerate"
              : "Generate Draft"}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Contacts */}
      {contacts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Contacts</p>
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email editor */}
      {(outreach || generating) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* To */}
          <div className="flex items-center border-b border-gray-800 px-4 py-2">
            <span className="text-xs text-gray-500 w-14">To:</span>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={isSent}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center border-b border-gray-800 px-4 py-2">
            <span className="text-xs text-gray-500 w-14">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setSaved(false); }}
              disabled={isSent}
              placeholder="Subject line..."
              className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setSaved(false); }}
            disabled={isSent}
            rows={14}
            placeholder={generating ? "Generating..." : "Email body..."}
            className="w-full bg-transparent text-sm text-gray-200 outline-none p-4 resize-none placeholder-gray-600"
          />

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2">
              {isSent ? (
                <span className="text-xs text-green-400 font-medium">✓ Sent</span>
              ) : (
                <>
                  <button
                    onClick={save}
                    disabled={saving || !outreach}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition"
                  >
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save Draft"}
                  </button>
                  <button
                    onClick={send}
                    disabled={true}
                    title="Enable OUTREACH_SEND_ENABLED=true in .env.local to activate"
                    className="bg-blue-900/40 text-blue-400 text-xs px-3 py-1.5 rounded opacity-50 cursor-not-allowed"
                  >
                    Send Email
                  </button>
                </>
              )}
            </div>
            <span className="text-xs text-gray-600">
              {body.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </div>
      )}

      {!outreach && !generating && (
        <div className="text-center text-gray-600 py-16">
          Click &quot;Generate Draft&quot; to create a personalized outreach email.
        </div>
      )}
    </div>
  );
}
