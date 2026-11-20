import data from "@/mock/data/bookings.json";
import { addDays, toISODate } from "@/lib/format";
import type { DictKey } from "@/i18n";

export type Venue = (typeof data.venues)[number];
export type Amenity = (typeof data.amenities)[number];

export const VENUES: Venue[] = data.venues;
export const AMENITIES: Amenity[] = data.amenities;
export const venueById = (id: string) => VENUES.find((v) => v.id === id);
export const amenityById = (id: string) => AMENITIES.find((a) => a.id === id);

// ── Booking window ─────────────────────────────────────────────

/** Bookings open this many days ahead (today + LEAD_DAYS is the first bookable day)… */
export const LEAD_DAYS = 2;
/** …and close this many days ahead (today + WINDOW_DAYS is the last bookable day). */
export const WINDOW_DAYS = 60;
export const firstBookable = (today: string) => addDays(today, LEAD_DAYS);
export const lastBookable = (today: string) => addDays(today, WINDOW_DAYS);

// ── Slots ──────────────────────────────────────────────────────

/** Every slot is two hours long; one booking takes one to MAX_SLOTS consecutive slots. */
export const SLOT_HOURS = 2;
export const MAX_SLOTS = 4;

/** Start hours of the venue's slots, e.g. [6, 8, …, 20] for a venue open 06:00–22:00. */
export function venueSlots(v: Venue): number[] {
  const out: number[] = [];
  for (let h = v.open; h + SLOT_HOURS <= v.close; h += SLOT_HOURS) out.push(h);
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (hour: number) => `${pad(hour)}:00`;
export const slotLabel = (hour: number) => `${hhmm(hour)} – ${hhmm(hour + SLOT_HOURS)}`;

/** A booking already saved in this browser (from the applications store). */
export interface HeldSlots {
  venue: string;
  date: string;
  slots: number[];
}

/** Small deterministic string hash (FNV-1a), so "booked by others" is the same on every load. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Roughly one day in nine is booked out completely by other citizens. */
export const bookedOut = (venueId: string, date: string) => hash(`${venueId}|${date}|day`) % 9 === 0;
/** Otherwise about a quarter of the slots are taken by other citizens. */
const takenByOthers = (venueId: string, date: string, hour: number) => bookedOut(venueId, date) || hash(`${venueId}|${date}|${hour}`) % 4 === 0;

/** Start hours already taken on that day (other citizens' bookings plus the ones saved in this browser). */
export function takenSlots(v: Venue, date: string, held: HeldSlots[] = []): number[] {
  const mine = new Set(held.filter((b) => b.venue === v.id && b.date === date).flatMap((b) => b.slots));
  return venueSlots(v).filter((h) => mine.has(h) || takenByOthers(v.id, date, h));
}

export const freeSlots = (v: Venue, date: string, held: HeldSlots[] = []) => {
  const taken = new Set(takenSlots(v, date, held));
  return venueSlots(v).filter((h) => !taken.has(h));
};

// ── Days ───────────────────────────────────────────────────────

export type DayStatus = "outside" | "closed" | "full";

const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** Why a day cannot be booked at the venue, or null when at least one slot is free. */
export function dayStatus(v: Venue, iso: string, today: string, held: HeldSlots[] = []): DayStatus | null {
  if (iso < firstBookable(today) || iso > lastBookable(today)) return "outside";
  if (weekday(iso) === v.closedDay) return "closed";
  if (freeSlots(v, iso, held).length === 0) return "full";
  return null;
}

/** First bookable day on or after `from` (never before the window opens), or null. Bounded by the window. */
export function firstAvailableDay(v: Venue, today: string, held: HeldSlots[] = [], from = firstBookable(today)): string | null {
  const last = lastBookable(today);
  for (let iso = from < firstBookable(today) ? firstBookable(today) : from; iso <= last; iso = addDays(iso, 1)) {
    if (!dayStatus(v, iso, today, held)) return iso;
  }
  return null;
}

export const monthOf = (iso: string) => iso.slice(0, 7);
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return toISODate(new Date(y, m - 1 + n, 1)).slice(0, 7);
}

/**
 * Where the calendar opens: the chosen day if it can still be booked, otherwise the first available day
 * (focused, `active`), on that day's month. With no available day it opens on the window's first month.
 * Note the month can be later than the window's first month (today + 2 falls on the 30th/31st and the
 * month's last days are closed or fully booked), so "Previous month" is then enabled.
 */
export function calendarStart(v: Venue, today: string, held: HeldSlots[] = [], value: string | null = null) {
  const active = value && !dayStatus(v, value, today, held) ? value : firstAvailableDay(v, today, held);
  return { active, month: monthOf(active ?? firstBookable(today)) };
}

/** Whether the "Previous month" / "Next month" buttons can move from `month` (the window's months only). */
export function monthNav(month: string, today: string) {
  return { prev: month > monthOf(firstBookable(today)), next: month < monthOf(lastBookable(today)) };
}

/**
 * Whole weeks (Monday first) covering the month, including the days of the previous and next month
 * that fill the first and last week.
 */
export function monthGrid(month: string): string[][] {
  const [y, m] = month.split("-").map(Number);
  const first = toISODate(new Date(y, m - 1, 1));
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const lastDay = toISODate(new Date(y, m, 0));
  const end = addDays(lastDay, (7 - weekday(lastDay)) % 7);
  const weeks: string[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return weeks;
}

/** Day steps for the calendar keys (PageUp/PageDown move a month; handled separately). */
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/**
 * Next bookable day from `iso` in the direction of `key`, skipping days that cannot be booked.
 * Returns null when there is none in that direction inside the booking window.
 */
export function moveDay(v: Venue, iso: string, key: string, today: string, held: HeldSlots[] = []): string | null {
  const ok = (d: string) => !dayStatus(v, d, today, held);
  const lo = firstBookable(today);
  const hi = lastBookable(today);
  if (key in STEPS) {
    const step = STEPS[key];
    for (let d = addDays(iso, step); d >= lo && d <= hi; d = addDays(d, step)) if (ok(d)) return d;
    return null;
  }
  if (key === "Home" || key === "End") {
    const dow = (weekday(iso) + 6) % 7; // Monday = 0
    const week = Array.from({ length: 7 }, (_, i) => addDays(iso, i - dow)).filter(ok);
    return (key === "Home" ? week[0] : week[week.length - 1]) ?? null;
  }
  if (key === "PageUp" || key === "PageDown") {
    const [y, m, d] = iso.split("-").map(Number);
    const n = key === "PageUp" ? -1 : 1;
    const days = new Date(y, m - 1 + n + 1, 0).getDate();
    const target = toISODate(new Date(y, m - 1 + n, Math.min(d, days)));
    if (ok(target)) return target;
    // Otherwise the next bookable day beyond the target in the same direction.
    for (let i = 1; i <= WINDOW_DAYS; i++) {
      const fwd = addDays(target, i * n);
      if (ok(fwd)) return fwd;
    }
    return null;
  }
  return null;
}

// ── Slot selection ─────────────────────────────────────────────

export type SlotOutcome = { selected: number[]; note?: "taken" | "max" };

/**
 * One click on a slot. A booking is one run of consecutive slots: clicking next to the run extends it
 * (up to MAX_SLOTS), clicking an end of the run removes that end, clicking anywhere else starts a new run
 * with just that slot. A taken slot changes nothing.
 */
export function toggleSlot(selected: number[], hour: number, taken: number[]): SlotOutcome {
  if (taken.includes(hour)) return { selected, note: "taken" };
  const run = [...selected].sort((a, b) => a - b);
  if (run.length === 0) return { selected: [hour] };
  const lo = run[0];
  const hi = run[run.length - 1];
  if (run.includes(hour)) {
    if (hour === lo) return { selected: run.slice(1) };
    if (hour === hi) return { selected: run.slice(0, -1) };
    return { selected: [hour] };
  }
  if (hour === lo - SLOT_HOURS || hour === hi + SLOT_HOURS) {
    if (run.length >= MAX_SLOTS) return { selected: run, note: "max" };
    return { selected: [...run, hour].sort((a, b) => a - b) };
  }
  return { selected: [hour] };
}

// ── Fees ───────────────────────────────────────────────────────

export interface Fees {
  hours: number;
  hire: number;
  amenities: number;
  deposit: number;
  total: number;
}

export function bookingFees(v: Venue, slots: number[], amenityIds: string[]): Fees {
  const hours = slots.length * SLOT_HOURS;
  const hire = hours * v.rate;
  const amenities = amenityIds.reduce((sum, id) => sum + (amenityById(id)?.fee ?? 0), 0);
  return { hours, hire, amenities, deposit: v.deposit, total: hire + amenities + v.deposit };
}

// ── Validation ─────────────────────────────────────────────────

export const PURPOSE_MIN = 5;
export const PURPOSE_MAX = 120;

export interface BookingDraft {
  venue: string;
  date: string | null;
  slots: number[];
  amenities: string[];
  purpose: string;
  attendees: string;
}

export const EMPTY_BOOKING: BookingDraft = { venue: "", date: null, slots: [], amenities: [], purpose: "", attendees: "" };

export type BookingField = "venue" | "date" | "slots" | "purpose" | "attendees";
export interface FieldError {
  key: DictKey;
  vars?: Record<string, string | number>;
}
export type BookingErrors = Partial<Record<BookingField, FieldError>>;

/** Every problem with the draft; the messages carry their own variables (the summary renders them as is). */
export function validateBooking(d: BookingDraft, today: string, held: HeldSlots[] = []): BookingErrors {
  const e: BookingErrors = {};
  const v = venueById(d.venue);
  if (!v) e.venue = { key: "bk.errVenue" };
  if (!d.date) e.date = { key: "bk.errDate" };
  else if (v && dayStatus(v, d.date, today, held)) e.date = { key: "bk.errDateGone" };
  if (d.date && v && !e.date) {
    const taken = takenSlots(v, d.date, held);
    if (d.slots.length === 0) e.slots = { key: "bk.errSlots" };
    else if (d.slots.some((h) => taken.includes(h))) e.slots = { key: "bk.errSlotsGone" };
  }
  const purpose = d.purpose.trim();
  if (purpose.length < PURPOSE_MIN) e.purpose = { key: "bk.errPurpose", vars: { min: PURPOSE_MIN } };
  else if (purpose.length > PURPOSE_MAX) e.purpose = { key: "bk.errPurposeLong", vars: { max: PURPOSE_MAX } };
  const n = Number(d.attendees);
  if (!/^\d+$/.test(d.attendees.trim()) || n < 1) e.attendees = { key: "bk.errAttendees" };
  else if (v && n > v.capacity) e.attendees = { key: "bk.errAttendeesMax", vars: { capacity: v.capacity } };
  return e;
}
