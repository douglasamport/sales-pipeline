"use client";

const SORT_OPTIONS = [
  { value: "total_score", label: "Score" },
  { value: "name", label: "Name" },
  { value: "google_rating", label: "Rating" },
  { value: "review_count", label: "Reviews" },
];

const STATUS_OPTIONS = [
  "scored",
  "reviewed",
  "contacted",
  "replied",
  "discussing",
  "booked",
  "discarded",
];

export interface FilterSortState {
  category: string;
  niche: string;
  city: string;
  status: string;
  tier: string;
  user: "mine" | "all";
  sortBy: string;
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: FilterSortState = {
  niche: "all",
  category: "all",
  city: "all",
  status: "all",
  tier: "all",
  user: "mine",
  sortBy: "total_score",
  sortDir: "desc",
};

interface FilterSortBarProps {
  filters: FilterSortState;
  onChange: (filters: FilterSortState) => void;
  niches: string[];
  categories: string[];
  cities: string[];
  resultCount: number;
}

const SELECT =
  "bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function FilterSortBar({
  filters,
  onChange,
  niches,
  categories,
  cities,
  resultCount,
}: FilterSortBarProps) {
  function set(key: keyof FilterSortState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange(DEFAULT_FILTERS);
  }

  const activeFilterCount = [
    filters.niche !== "all",
    filters.category !== "all",
    filters.city !== "all",
    filters.status !== "all",
    filters.tier !== "all",
  ].filter(Boolean).length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center gap-2">
      {/* Niches */}
      {niches.length > 0 && (
        <select
          value={filters.niche}
          onChange={(e) => set("niche", e.target.value)}
          className={SELECT}
        >
          <option value="all">All niches</option>
          {niches.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      )}

      {/* Category */}
      {categories.length > 0 && (
        <select
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
          className={SELECT}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      )}

      {/* City */}
      {cities.length > 0 && (
        <select
          value={filters.city}
          onChange={(e) => set("city", e.target.value)}
          className={SELECT}
        >
          <option value="all">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value)}
        className={SELECT}
      >
        <option value="all">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      {/* Tier */}
      <select
        value={filters.tier}
        onChange={(e) => set("tier", e.target.value)}
        className={SELECT}
      >
        <option value="all">All tiers</option>
        <option value="A">Tier A</option>
        <option value="B">Tier B</option>
        <option value="C">Tier C</option>
      </select>

      {/* User */}
      <select
        value={filters.user}
        onChange={(e) => set("user", e.target.value)}
        className={SELECT}
      >
        <option value="mine">My Leads</option>
        <option value="all">All Leads</option>
      </select>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-700 mx-1" />

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Sort</span>
        <select
          value={filters.sortBy}
          onChange={(e) => set("sortBy", e.target.value)}
          className={SELECT}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")
          }
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-2.5 py-1.5 rounded hover:bg-gray-700 transition"
          title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {filters.sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Result count + clear */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-600">{resultCount} leads</span>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-500 hover:underline"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
