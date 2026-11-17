import data from "../data/directory.json";
import { call } from "../api";
import { zones } from "./geo";
import type { Lang } from "@/i18n";

type Text = { en: string; ta: string };

export interface Department extends Text {
  id: string;
}

export interface Official {
  id: string;
  name: Text;
  designation: Text;
  department: string;
  /** "head" = Corporation Head Office, otherwise a zone id (Z1–Z6). */
  office: string;
  /** Extension on the city helpline 155 2026. */
  ext: string;
  email: string;
}

export const DEPARTMENTS = data.departments as Department[];
export const OFFICIALS = data.officials as Official[];
export const DIRECTORY_PAGE_SIZE = data.pageSize;
export const HELPLINE = "155 2026";

const HEAD_OFFICE: Text = { en: "Corporation Head Office", ta: "மாநகராட்சி தலைமை அலுவலகம்" };

export const departmentById = (id: string) => DEPARTMENTS.find((d) => d.id === id);
export const officeName = (office: string): Text => (office === "head" ? HEAD_OFFICE : zones.find((z) => z.id === office) ?? HEAD_OFFICE);
/** The comma is a dialling pause before the extension. */
export const phoneHref = (o: Official) => `tel:${HELPLINE.replace(/\s/g, "")},${o.ext}`;

export type SortKey = "name" | "designation" | "department" | "office";
export const SORT_KEYS: SortKey[] = ["name", "designation", "department", "office"];

export interface OfficialsQuery {
  /** "" = all departments. */
  department: string;
  /** Free text matched against name and designation (both languages). */
  q: string;
  /** "" = the published order (by department, senior posts first). */
  sort: SortKey | "";
  dir: "asc" | "desc";
  page: number;
}

export const DEFAULT_QUERY: OfficialsQuery = { department: "", q: "", sort: "", dir: "asc", page: 0 };

export interface OfficialsPage {
  rows: Official[];
  page: number;
  pages: number;
  total: number;
}

export function sortText(o: Official, key: SortKey, lang: Lang): string {
  if (key === "department") return departmentById(o.department)?.[lang] ?? o.department;
  if (key === "office") return officeName(o.office)[lang];
  return o[key][lang];
}

/** Every official matching the filter, in the requested order (no paging). */
export function matchOfficials(query: Omit<OfficialsQuery, "page">, lang: Lang, all: Official[] = OFFICIALS): Official[] {
  const needle = query.q.trim().toLocaleLowerCase();
  const matching = all.filter(
    (o) =>
      (!query.department || o.department === query.department) &&
      (!needle || [o.name.en, o.name.ta, o.designation.en, o.designation.ta].some((s) => s.toLocaleLowerCase().includes(needle))),
  );
  const { sort } = query;
  if (!sort) return matching;
  const collator = new Intl.Collator(lang === "ta" ? "ta" : "en-IN", { sensitivity: "base", numeric: true });
  const rank = new Map(all.map((o, i) => [o.id, i]));
  const sign = query.dir === "desc" ? -1 : 1;
  return [...matching].sort((a, b) => sign * collator.compare(sortText(a, sort, lang), sortText(b, sort, lang)) || rank.get(a.id)! - rank.get(b.id)!);
}

/** One page of the directory. A page past the end is clamped to the last page. */
export function queryOfficials(query: OfficialsQuery, lang: Lang, all: Official[] = OFFICIALS, size = DIRECTORY_PAGE_SIZE): OfficialsPage {
  const matching = matchOfficials(query, lang, all);
  const pages = Math.max(1, Math.ceil(matching.length / size));
  const page = Math.min(Math.max(0, query.page), pages - 1);
  return { rows: matching.slice(page * size, page * size + size), page, pages, total: matching.length };
}

/** A page of the directory after a filter, sort or page change (DIRECTORY_PAGE, 800ms). */
export const fetchOfficials = (query: OfficialsQuery, lang: Lang) => call("DIRECTORY_PAGE", () => queryOfficials(query, lang));

/** Every matching official for the download (DIRECTORY_EXPORT, 1s). */
export const fetchOfficialsForExport = (query: OfficialsQuery, lang: Lang) => call("DIRECTORY_EXPORT", () => matchOfficials(query, lang));
