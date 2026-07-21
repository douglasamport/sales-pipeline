"use client";
import React from "react";
import { createContext, useContext, useState } from "react";
import { FilterSortState, DEFAULT_FILTERS } from "@/components/FilterSortBar";

interface FilterContextValue {
  filters: FilterSortState;
  setFilters: (
    f: FilterSortState | ((prev: FilterSortState) => FilterSortState),
  ) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [filters, setFilters] = useState<FilterSortState>({
    ...DEFAULT_FILTERS,
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
