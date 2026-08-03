import type { Audit, Lead } from "./types";
import type { FilterSortState } from "@/components/FilterSortBar";

export function groupFilterElements(leads: Lead[]) {
  const allNiches = Array.from(
    new Set(leads.flatMap((l) => l.niche ?? [])),
  ).sort();

  const allCategories = Array.from(
    new Set(leads.flatMap((l) => l.categories ?? [])),
  ).sort();

  const allCities = Array.from(
    new Set(leads.map((l) => l.city).filter(Boolean) as string[]),
  ).sort();

  return { allNiches, allCategories, allCities };
}

export function filterAndSort(
  leads: Lead[],
  filters: FilterSortState,
  audits: Record<number, Audit>,
  user: string | null | undefined,
) {
  return leads
    .filter((lead) => {
      const audit = audits[lead.id];

      if (
        filters.category !== "all" &&
        !lead.categories?.includes(filters.category)
      )
        return false;

      if (filters.niche !== "all" && !lead.niche?.includes(filters.niche))
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

      if (filters.user !== "all" && lead.user_email !== user) return false;

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
}
