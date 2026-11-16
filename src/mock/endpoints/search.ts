import index from "../data/search-index.json";
import { call } from "../api";

export type SearchItem = (typeof index)[number];

export function rankSearch(q: string, items: SearchItem[] = index): SearchItem[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return items
    .map((it) => {
      const hay = `${it.en} ${it.ta} ${it.keywords} ${it.dept}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (it.en.toLowerCase().startsWith(t) ? 3 : 0) + (hay.includes(t) ? 1 : -100), 0);
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.it);
}

export const searchSuggest = (q: string) => call("SEARCH_SUGGEST", () => rankSearch(q));
