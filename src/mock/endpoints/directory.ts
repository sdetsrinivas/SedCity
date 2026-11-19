import data from "../data/directory.json";
import { call } from "../api";
import { wardById, zones } from "./geo";
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

// ── Offices (module 9 part B: /directory/offices) ──────────────────────────────

export type OfficeKind = "head" | "zone" | "ward" | "csc" | "water" | "health";

export interface Office {
  id: string;
  kind: OfficeKind;
  name: Text;
  wardId: string;
  street: string;
  pincode: string;
  lat: number;
  lng: number;
  /** Extension on the city helpline 155 2026. */
  ext: string;
}

export interface OfficeService extends Text {
  id: string;
  /** The online service on this portal, when there is one. */
  href?: string;
}

/** Opening and closing time ("HH:MM"), or null when closed that day. */
export type OpeningHours = [string, string] | null;

export interface OfficeKindInfo extends Text {
  id: OfficeKind;
  /** Monday first. */
  hours: OpeningHours[];
  services: string[];
}

export const OFFICES = data.offices as Office[];
export const OFFICE_KINDS = data.officeKinds as OfficeKindInfo[];
export const OFFICE_SERVICES = data.officeServices as OfficeService[];

export const officeById = (id: string) => OFFICES.find((o) => o.id === id);
export const officeKind = (kind: OfficeKind) => OFFICE_KINDS.find((k) => k.id === kind)!;
export const officeServices = (kind: OfficeKind) => officeKind(kind).services.map((id) => OFFICE_SERVICES.find((s) => s.id === id)!);
export const officePhoneHref = (o: Office) => `tel:${HELPLINE.replace(/\s/g, "")},${o.ext}`;

/** The city on the map: latitude of the top edge, longitude of the left edge, and the spans (degrees). */
export const CITY_BOUNDS = { north: 12.55, west: 79.4, latSpan: 0.15, lngSpan: 0.2 };
export const CITY_CENTRE = { lat: CITY_BOUNDS.north - CITY_BOUNDS.latSpan / 2, lng: CITY_BOUNDS.west + CITY_BOUNDS.lngSpan / 2 };
/** Further than this from the centre is outside the Corporation limits. */
export const CITY_LIMIT_KM = 15;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearbyOffices {
  /** Every office, nearest first (ties in published order). */
  ranked: { id: string; km: number }[];
  /** Distance from the city centre. */
  fromCentreKm: number;
  outside: boolean;
}

export function rankOffices(from: LatLng, all: Office[] = OFFICES): NearbyOffices {
  const ranked = all.map((o, i) => ({ id: o.id, km: distanceKm(from, o), i }))
    .sort((a, b) => a.km - b.km || a.i - b.i)
    .map(({ id, km }) => ({ id, km }));
  const fromCentreKm = distanceKm(from, CITY_CENTRE);
  return { ranked, fromCentreKm, outside: fromCentreKm > CITY_LIMIT_KM };
}

/**
 * Offices of one kind ("" = all) whose name, street, locality or PIN code contains the text, in the given
 * order of ids (or the published order).
 */
export function matchOffices(kind: OfficeKind | "", q: string, order?: string[], all: Office[] = OFFICES): Office[] {
  const needle = q.trim().toLocaleLowerCase();
  const byId = new Map(all.map((o) => [o.id, o]));
  const list = order ? order.map((id) => byId.get(id)!).filter(Boolean) : all;
  return list.filter((o) => {
    if (kind && o.kind !== kind) return false;
    if (!needle) return true;
    const ward = wardById(o.wardId);
    return [o.name.en, o.name.ta, o.street, o.pincode, ward?.en ?? "", ward?.ta ?? ""].some((s) => s.toLocaleLowerCase().includes(needle));
  });
}

/** Offices ranked by distance from the position the browser shared (OFFICE_NEAREST, 1s). */
export const findNearestOffices = (from: LatLng) => call("OFFICE_NEAREST", () => rankOffices(from));

/** The map panel (MAP_IFRAME, 5s before the map frame is inserted). */
export const loadOfficeMap = () => call("MAP_IFRAME", () => true);
