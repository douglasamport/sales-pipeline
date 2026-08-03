"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/lib/types";
import { useSession } from "next-auth/react";

const NICHES = [
  "Dental",
  "Legal",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Landscaping",
  "Physiotherapy",
  "Chiropractic",
  "Accounting",
  "Real Estate",
  "Optometry",
  "Veterinary",
  "Auto Repair",
  "Flooring",
  "Painting",
  "Electrical",
  "Home Renovation",
];

interface SearchLog {
  id: number;
  created_at: string;
  niche: string;
  search_query: string | null;
  city: string;
  leads_found: number;
  leads_inserted: number;
  status: "success" | "error";
  error_message: string | null;
}

export default function LeadsPage() {
  const [niche, setNiche] = useState(NICHES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("Calgary");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);

  useEffect(() => {
    fetch(`/api/search-logs?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []));
  }, []);

  async function handleScrape() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          city,
          searchQuery: searchQuery.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setLeads(data.leads);

      // Refresh search log
      fetch(`/api/search-logs?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setLogs(d.logs ?? []));
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lead Collection</h1>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Niche</label>
          <input
            type="text"
            list="niche-options"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. Dental"
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
          />
          <datalist id="niche-options">
            {NICHES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Search query{" "}
            <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`e.g. Pediatric ${niche}`}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
          />
        </div>

        <button
          onClick={handleScrape}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition"
        >
          {loading ? "Generating..." : "Generate Leads"}
        </button>

        {message && (
          <p className="text-sm text-gray-400 mt-1 w-full">{message}</p>
        )}
      </div>

      {/* Leads Table */}
      {leads.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Business</th>
                <th className="px-4 py-3 text-left">Website</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Reviews</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium">{lead.name}</div>
                    {lead.categories && lead.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
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
                        className="text-blue-400 hover:underline truncate block max-w-[180px]"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {lead.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {lead.google_rating ? (
                      <span className="text-yellow-400">
                        ★ {lead.google_rating}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {lead.review_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full text-xs">
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length === 0 && !loading && (
        <div className="text-center text-gray-600 mt-20">
          Select a niche and hit Generate Leads to get started.
        </div>
      )}

      {/* Search History */}
      {logs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Search History
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Niche</th>
                  <th className="px-4 py-3 text-left">Search query</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-right">Found</th>
                  <th className="px-4 py-3 text-right">New</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-CA", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{log.niche}</td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {log.search_query ?? (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{log.city}</td>
                    <td className="px-4 py-2.5 text-gray-300 text-right">
                      {log.leads_found ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          (log.leads_inserted ?? 0) > 0
                            ? "text-green-400 font-medium"
                            : "text-gray-600"
                        }
                      >
                        {log.leads_inserted ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {log.status === "error" ? (
                        <span
                          className="text-red-400 text-xs"
                          title={log.error_message ?? ""}
                        >
                          ✕ Error
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
