"use client";

import { useState } from "react";

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
];

interface Lead {
  id: number;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  niche: string;
  google_rating?: number;
  review_count?: number;
  status: string;
}

export default function LeadsPage() {
  const [niche, setNiche] = useState(NICHES[0]);
  const [city, setCity] = useState("Calgary");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);

  async function handleScrape() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setLeads(data.leads);
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
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {NICHES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
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
                  <td className="px-4 py-3 text-gray-300">{lead.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead.google_rating ? (
                      <span className="text-yellow-400">★ {lead.google_rating}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{lead.review_count ?? "—"}</td>
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
    </div>
  );
}
