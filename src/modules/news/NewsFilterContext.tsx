"use client";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { NewsFilter } from "@/mock/endpoints/news";

export const DEFAULT_FILTER: NewsFilter = { eventsOnly: false, category: "" };

export interface FilterStore {
  get(): NewsFilter;
  set(patch: Partial<NewsFilter>): void;
  subscribe(listener: () => void): () => void;
}

function createFilterStore(): FilterStore {
  let state = DEFAULT_FILTER;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const FilterContext = createContext<FilterStore | null>(null);

/**
 * Shares the list filter between the category dropdown, the "Show events only" island and the list.
 * The context value is a stable store object (never a new value), so a change does not reach into the
 * not-yet-hydrated island and force it to hydrate early.
 */
export function NewsFilterProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createFilterStore);
  return <FilterContext.Provider value={store}>{children}</FilterContext.Provider>;
}

export function useFilterStore(): FilterStore {
  const store = useContext(FilterContext);
  if (!store) throw new Error("useFilterStore must be used inside NewsFilterProvider");
  return store;
}

export function useNewsFilter(): [NewsFilter, FilterStore] {
  const store = useFilterStore();
  const filter = useSyncExternalStore(store.subscribe, store.get, () => DEFAULT_FILTER);
  return [filter, store];
}
