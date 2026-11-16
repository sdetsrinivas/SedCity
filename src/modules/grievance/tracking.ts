import data from "@/mock/data/grievance.json";
import { addDays, toISODate } from "@/lib/format";

/** Stages a grievance moves through. Index = stage number stored with the grievance. */
export const STAGES = ["submitted", "assigned", "inspection", "progress", "resolved"] as const;
export type StageKey = (typeof STAGES)[number];
export const STAGE_INSPECTION = 2;
export const STAGE_RESOLVED = 4;

export const REF_PATTERN = /^AMC\/GR\/\d{4}\/\d{6}$/;

/** TXT-05: what the grievance-number field keeps from each keystroke: upper case, no spaces, at most 18 characters. */
export const normaliseRefInput = (raw: string) => raw.toUpperCase().replace(/\s+/g, "").slice(0, 18);

export type RefError = "gt.errRefEmpty" | "gt.errRefFormat";
export function validateRef(ref: string): RefError | null {
  if (!ref) return "gt.errRefEmpty";
  return REF_PATTERN.test(ref) ? null : "gt.errRefFormat";
}

// ── DAT-06: inspection dates that can be chosen when rescheduling ──────────────

/** Days after today that can be booked (tomorrow … today + WINDOW_DAYS). */
export const WINDOW_DAYS = 30;

export type Holiday = (typeof data.holidays)[number];
export type Unavailable =
  | { kind: "outside" }
  | { kind: "sunday" }
  | { kind: "saturday"; nth: 2 | 4 }
  | { kind: "holiday"; holiday: Holiday }
  | { kind: "full" };

const holidayOn = (iso: string) => data.holidays.find((h) => h.date === iso);

const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const weekday = (iso: string) => {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d).getDay();
};

/** Inspection slots of a working day are all taken (a fixed pattern, roughly one working day in eleven). */
export function isFullyBooked(iso: string): boolean {
  const [y, m, d] = parts(iso);
  return (y * 13 + m * 31 + d * 7) % 11 === 0;
}

/** Why a date cannot be chosen, or null when it is available. */
export function unavailableReason(iso: string, today: string): Unavailable | null {
  if (iso <= today || iso > addDays(today, WINDOW_DAYS)) return { kind: "outside" };
  const dow = weekday(iso);
  if (dow === 0) return { kind: "sunday" };
  const nth = Math.ceil(parts(iso)[2] / 7);
  if (dow === 6 && (nth === 2 || nth === 4)) return { kind: "saturday", nth };
  const holiday = holidayOn(iso);
  if (holiday) return { kind: "holiday", holiday };
  if (isFullyBooked(iso)) return { kind: "full" };
  return null;
}

export const isAvailable = (iso: string, today: string) => unavailableReason(iso, today) === null;

/** First available date on or after `from` (searching the booking window), or null. */
export function firstAvailable(from: string, today: string): string | null {
  for (let iso = from <= today ? addDays(today, 1) : from; iso <= addDays(today, WINDOW_DAYS); iso = addDays(iso, 1)) {
    if (isAvailable(iso, today)) return iso;
  }
  return null;
}

/** Weeks of a month (Monday first); null pads the first and last week. */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => toISODate(new Date(y, m - 1, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export const monthOf = (iso: string) => iso.slice(0, 7);
export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return toISODate(new Date(y, m - 1 + n, 1)).slice(0, 7);
};

/** Keyboard movement inside the calendar grid. */
export function moveDate(iso: string, key: string): string | null {
  const [y, m, d] = parts(iso);
  const dow = (weekday(iso) + 6) % 7; // Monday = 0
  switch (key) {
    case "ArrowLeft": return addDays(iso, -1);
    case "ArrowRight": return addDays(iso, 1);
    case "ArrowUp": return addDays(iso, -7);
    case "ArrowDown": return addDays(iso, 7);
    case "Home": return addDays(iso, -dow);
    case "End": return addDays(iso, 6 - dow);
    case "PageUp":
    case "PageDown": {
      const t = new Date(y, m - 1 + (key === "PageUp" ? -1 : 1), 1);
      const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      return toISODate(new Date(t.getFullYear(), t.getMonth(), Math.min(d, last)));
    }
    default: return null;
  }
}

/** Keeps a date inside tomorrow … today + WINDOW_DAYS. */
export function clampToWindow(iso: string, today: string): string {
  const min = addDays(today, 1);
  const max = addDays(today, WINDOW_DAYS);
  return iso < min ? min : iso > max ? max : iso;
}

// ── OTH-09: star rating ─────────────────────────────────────────────────────────
export const MAX_STARS = 5;
export const COMMENT_MAX = 300;
