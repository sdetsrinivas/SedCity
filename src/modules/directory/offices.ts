import { pick, type Lang } from "@/i18n";
import { wardById, zones } from "@/mock/endpoints/geo";
import { CITY_BOUNDS, officeKind, type LatLng, type Office } from "@/mock/endpoints/directory";
import { CELL, COLS, PAD, ROWS } from "@/modules/grievance/mapGeometry";

/** Distance for display: one decimal, in the page language's number format. */
export const formatKm = (km: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "ta" ? "ta-IN" : "en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km);

/** "Ward 12 – Natarajapuram" → "Natarajapuram". */
export const locality = (office: Office, lang: Lang) => {
  const ward = wardById(office.wardId);
  return ward ? pick(ward, lang).split(" – ")[1] ?? pick(ward, lang) : "";
};

export const wardName = (office: Office, lang: Lang) => {
  const ward = wardById(office.wardId);
  return ward ? pick(ward, lang) : "";
};

export const zoneName = (office: Office, lang: Lang) => {
  const zoneId = wardById(office.wardId)?.zoneId;
  const zone = zones.find((z) => z.id === zoneId);
  return zone ? pick(zone, lang) : "";
};

/** Second line of a list row: type of office · street, locality. */
export const rowMeta = (office: Office, lang: Lang) => `${pick(officeKind(office.kind), lang)} · ${office.street}, ${locality(office, lang)}`;

/** Position on the city map (the ward map's SVG coordinates). */
export function toMapPoint(p: LatLng): { x: number; y: number } {
  const x = PAD + ((p.lng - CITY_BOUNDS.west) / CITY_BOUNDS.lngSpan) * COLS * CELL;
  const y = PAD + ((CITY_BOUNDS.north - p.lat) / CITY_BOUNDS.latSpan) * ROWS * CELL;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/** Monday-first weekday index (0 = Monday) of a date. */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** One row of the office list, already in the page language (src/vanilla/office-list.js renders it). */
export interface OfficeRow {
  id: string;
  title: string;
  meta: string;
  distance?: string;
}
