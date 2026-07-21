"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FilterSortState, DEFAULT_FILTERS } from "@/components/FilterSortBar";

interface FilterContextValue {
  filters: FilterSortState;
  setFilters: (f: FilterSortState | ((prev: FilterSortState) => FilterSortState)) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [filters, setFilters] = useState<FilterSortState>(DEFAULT_FILTERS);
  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
