import data from "@/mock/data/dashboard.json";
import type { Application } from "@/lib/applications";
import { addDays, toISODate } from "@/lib/format";
import type { PayMethod } from "@/modules/water/payment";
import { allBookings, isMine } from "@/modules/bookings/manage";

/**
 * Pure rules of the citizen dashboard (module 11 part A): the seeded notifications, documents and
 * payments of the demo citizens (placed relative to `today`), date ranges and monthly totals for the
 * payment charts, and the widget reordering rule. Shared by the page, the mock endpoint, the unit tests
 * and the verification checks.
 */

export type Bi = { en: string; ta: string };

export interface Notice { id: string; at: string; unread: boolean; text: Bi }

export type DocKind = "receipt" | "certificate" | "acknowledgement" | "licence";
export interface Doc { id: string; kind: DocKind; name: Bi; ref: string; date: string; sizeKb: number }

export type PayService = "water" | "property-tax" | "trade" | "booking";
export const PAY_SERVICES: PayService[] = ["water", "property-tax", "trade", "booking"];
export interface Payment { ref: string; date: string; service: PayService; detail: string; method: PayMethod; amount: number }

export interface Range { from: string; to: string }

const CODE: Record<PayService, string> = { water: "WT", "property-tax": "PT", trade: "TL", booking: "BK" };
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

// ── Months ─────────────────────────────────────────────────────

/** "2026-11-20" → "2026-11" */
export const monthOf = (iso: string) => iso.slice(0, 7);

/** The month `k` months before the month of `iso` ("2026-11", 2 → "2026-09"). */
export function shiftMonth(month: string, k: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 - k, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return toISODate(new Date(y, m, 0));
};

/** Day `day` of the month `k` months before today's month, clamped to the month's length. */
export function dayMonthsAgo(today: string, k: number, day: number): string {
  const month = shiftMonth(monthOf(today), k);
  const last = lastDayOf(month);
  return `${month}-${pad(Math.min(day, Number(last.slice(8))))}`;
}

/** Every month from `from`'s month to `to`'s month, oldest first. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = monthOf(from); m <= monthOf(to); m = shiftMonth(m, -1)) out.push(m);
  return out;
}

// ── Seeded records ─────────────────────────────────────────────

type SeedUser = keyof typeof data.notices;
const isSeedUser = (u: string): u is SeedUser => u in data.notices;

export function seededNotices(username: string, today: string): Notice[] {
  if (!isSeedUser(username)) return [];
  return data.notices[username].map((n) => ({
    id: n.id, unread: n.unread, text: { en: n.en, ta: n.ta }, at: `${addDays(today, -n.daysAgo)}T${n.time}:00`,
  }));
}

export function seededDocs(username: string, today: string): Doc[] {
  if (!isSeedUser(username)) return [];
  return data.documents[username].map((d) => ({
    id: d.id, kind: d.kind as DocKind, name: { en: d.en, ta: d.ta }, ref: d.ref, sizeKb: d.sizeKb, date: addDays(today, -d.daysAgo),
  }));
}

/**
 * The demo citizens' payments: each series pays `amounts[i]` on `day` of the month `start + i * every`
 * months before today's month (a date after today is left out). Receipt numbers count up with time.
 */
export function seededPayments(username: string, today: string): Payment[] {
  if (!isSeedUser(username)) return [];
  const out: Payment[] = [];
  for (const s of data.payments[username]) {
    s.amounts.forEach((amount, i) => {
      const date = dayMonthsAgo(today, s.start + i * s.every, s.day);
      if (date > today) return;
      const service = s.service as PayService;
      out.push({
        ref: `AMC/${CODE[service]}/${date.slice(0, 4)}/${pad(s.seq - i * 41, 6)}`,
        date, service, detail: s.detail, method: s.method as PayMethod, amount,
      });
    });
  }
  return sortPayments(out);
}

/** Payments made through the portal in this browser (water and property tax receipts). */
export function browserPayments(stored: Application[]): Payment[] {
  return stored
    .filter((a) => a.status === "Paid" && (a.service === "water" || a.service === "property-tax") && typeof a.amount === "number")
    .map((a) => ({
      ref: a.ref,
      date: toISODate(new Date(a.submittedAt)),
      service: a.service as PayService,
      detail: a.details.consumerNo ?? a.details.assessmentNo ?? "",
      method: (a.details.method as PayMethod) ?? "upi",
      amount: a.amount!,
    }));
}

/** Newest first; same day by receipt number. */
export const sortPayments = (ps: Payment[]) => [...ps].sort((a, b) => b.date.localeCompare(a.date) || b.ref.localeCompare(a.ref));

/** The citizen's applications: everything saved in this browser except bookings, plus their own bookings (seeded ones too). */
export function dashboardApplications(stored: Application[], mobile: string, today: string): Application[] {
  const own = allBookings(stored, today).filter((a) => isMine(a, mobile));
  return [...stored.filter((a) => a.service !== "booking"), ...own].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || a.ref.localeCompare(b.ref));
}

// ── Date ranges and totals ─────────────────────────────────────

/** The last `months` calendar months, this one included, up to today. */
export const presetRange = (today: string, months: number): Range => ({ from: `${shiftMonth(monthOf(today), months - 1)}-01`, to: today });

/** The whole of one month (up to today for the current month). */
export function monthRange(month: string, today: string): Range {
  const last = lastDayOf(month);
  return { from: `${month}-01`, to: last > today ? today : last };
}

/** How far back the range calendar goes: the first day of the month 23 months ago. */
export const earliestDay = (today: string) => `${shiftMonth(monthOf(today), 23)}-01`;

export const inRange = (iso: string, r: Range) => iso >= r.from && iso <= r.to;

/** A first click starts a new range; a second click on or after the start ends it, before it starts again. */
export function pickDay(sel: { from: string | null; to: string | null }, day: string): { from: string; to: string | null } {
  if (!sel.from || sel.to || day < sel.from) return { from: day, to: null };
  return { from: sel.from, to: day };
}

export function monthlyTotals(ps: Payment[], r: Range): { month: string; total: number }[] {
  return monthsBetween(r.from, r.to).map((month) => ({
    month,
    total: round2(ps.filter((p) => monthOf(p.date) === month && inRange(p.date, r)).reduce((s, p) => s + p.amount, 0)),
  }));
}

export function serviceTotals(ps: Payment[]): { service: PayService; total: number; count: number }[] {
  return PAY_SERVICES.map((service) => {
    const of = ps.filter((p) => p.service === service);
    return { service, total: round2(of.reduce((s, p) => s + p.amount, 0)), count: of.length };
  }).filter((x) => x.count > 0);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Widget order ───────────────────────────────────────────────

export type WidgetId = "notifications" | "applications" | "payments" | "documents";
export const WIDGETS: WidgetId[] = ["notifications", "applications", "payments", "documents"];

/** A saved order, repaired: unknown ids dropped, missing ones appended in the default order. */
export function normaliseOrder(saved: unknown): WidgetId[] {
  const list = Array.isArray(saved) ? saved.filter((x): x is WidgetId => WIDGETS.includes(x as WidgetId)) : [];
  const uniq = [...new Set(list)];
  return [...uniq, ...WIDGETS.filter((w) => !uniq.includes(w))];
}

/**
 * Where a dragged widget lands. `mids` are the vertical midpoints of the OTHER widgets (in order) when the
 * drag started, `y` the pointer. Moving down it passes every widget whose midpoint it reached; moving up,
 * every widget whose midpoint is still above it. So dropping on a widget's middle takes that widget's place.
 */
export function dropIndex(mids: number[], y: number, down: boolean): number {
  return mids.filter((m) => (down ? m <= y : m < y)).length;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, it);
  return next;
}

// ── Monthly chart geometry (canvas, CSS pixels) ─────────────────

export const CHART = { height: 220, left: 64, right: 12, top: 16, bottom: 28 };

/** The axis maximum: the smallest 1 / 2 / 2.5 / 5 × 10^k at or above the largest total. */
export function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v)!;
}

/** Each month's bar in a chart `width` CSS pixels wide: equal slots across the plot, bars 60% of a slot. */
export function barBoxes(width: number, totals: number[]): { x: number; y: number; w: number; h: number }[] {
  const plotW = width - CHART.left - CHART.right;
  const plotH = CHART.height - CHART.top - CHART.bottom;
  const max = niceMax(Math.max(0, ...totals));
  const slot = plotW / Math.max(1, totals.length);
  return totals.map((v, i) => {
    const h = (v / max) * plotH;
    const w = slot * 0.6;
    return { x: CHART.left + slot * i + (slot - w) / 2, y: CHART.top + plotH - h, w, h };
  });
}
