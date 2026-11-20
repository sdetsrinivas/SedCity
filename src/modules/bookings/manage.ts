import data from "@/mock/data/bookings.json";
import users from "@/mock/data/users.json";
import type { Application } from "@/lib/applications";
import { addDays, formatDate, toISODate } from "@/lib/format";
import {
  SLOT_HOURS, bookingFees, dayStatus, firstBookable, hhmm, lastBookable, takenSlots, venueById, venueSlots, type HeldSlots, type Venue,
} from "./booking";

/**
 * "My bookings" and moving a booking (module 10 part B). Pure rules shared by the page, the mock
 * endpoints, the unit tests and the verification checks.
 */

// ── Records ────────────────────────────────────────────────────

export const slotsOf = (app: Application) => (app.details.slots ?? "").split(",").filter(Boolean).map(Number);

/** Bookings that still hold their slots (a lapsed booking, status Rejected, releases them). */
export const isActive = (app: Application) => app.status !== "Rejected";

export const toHeld = (apps: Application[]): HeldSlots[] =>
  apps.filter(isActive).map((a) => ({ ref: a.ref, venue: a.details.venue, date: a.details.date, slots: slotsOf(a) }));

/** Booking records of the citizen with this mobile number (the number every booking is confirmed to). */
export const isMine = (app: Application, mobile: string) => app.details.mobile === mobile.replace(/\D/g, "").slice(-10);

/** By date, then start time, then booking number, so equal venue / date / time rows sit together. */
export function sortBookings(apps: Application[]): Application[] {
  return [...apps].sort((a, b) =>
    a.details.date.localeCompare(b.details.date) || slotsOf(a)[0] - slotsOf(b)[0] || a.ref.localeCompare(b.ref));
}

/** Pay by three days after booking, and never later than the day before the event. */
export const payByFor = (bookedOn: string, date: string) => [addDays(bookedOn, 3), addDays(date, -1)].sort()[0];

// ── Seeded bookings ────────────────────────────────────────────

type SeedGroup = (typeof data.seeded)[number];

/** True when all the venues of the group can take the group's slots on `date`. */
function groupFits(g: SeedGroup, date: string, today: string, held: HeldSlots[]): boolean {
  const slots = Array.from({ length: g.slots }, (_, i) => g.start + i * SLOT_HOURS);
  return g.items.every((it) => {
    const v = venueById(it.venue)!;
    if (dayStatus(v, date, today, held) || !slots.every((h) => venueSlots(v).includes(h))) return false;
    const taken = takenSlots(v, date, held);
    return slots.every((h) => !taken.includes(h));
  });
}

/** The booking number a seeded booking gets when it was made `bookedDaysAgo` days before `today`. */
const seedRef = (today: string, seq: number, bookedDaysAgo: number) =>
  `AMC/BK/${addDays(today, -bookedDaysAgo).slice(0, 4)}/${String(seq).padStart(6, "0")}`;

/**
 * The seeded bookings of the demo citizens (`data.seeded`), placed relative to `today`: each group goes on
 * the first day from today + offset (searching forward, then back to the window's first day) on which every
 * venue of the group is open and the slots are free. A group's bookings share venue / date / time on purpose
 * (a lapsed booking and its rebooking). Bounded by the booking window, so this always returns.
 *
 * `saved` are the booking records saved in this browser. They stay on fixed dates while the seeds move with
 * today, so their slots count as taken when placing a group (except a saved record that rewrites one of the
 * group's own bookings, which replaces that booking anyway). The result depends only on `today` and `saved`.
 */
export function seededBookings(today: string, saved: Application[] = []): Application[] {
  const out: Application[] = [];
  const savedHeld = toHeld(saved.filter((a) => a.service === "booking"));
  const held: HeldSlots[] = [];
  for (const g of data.seeded) {
    const own = new Set(g.items.map((it) => seedRef(today, it.seq, it.bookedDaysAgo)));
    const blocking = [...savedHeld.filter((h) => !own.has(h.ref ?? "")), ...held];
    const from = addDays(today, g.offset);
    let date: string | null = null;
    for (let d = from; !date && d <= lastBookable(today); d = addDays(d, 1)) if (groupFits(g, d, today, blocking)) date = d;
    for (let d = addDays(from, -1); !date && d >= firstBookable(today); d = addDays(d, -1)) if (groupFits(g, d, today, blocking)) date = d;
    if (!date) continue;
    const user = users.find((u) => u.username === g.user)!;
    const slots = Array.from({ length: g.slots }, (_, i) => g.start + i * SLOT_HOURS);
    for (const it of g.items) {
      const v = venueById(it.venue)!;
      const fees = bookingFees(v, slots, it.amenities);
      const bookedOn = addDays(today, -it.bookedDaysAgo);
      const [y, m, d] = bookedOn.split("-").map(Number);
      const app: Application = {
        ref: seedRef(today, it.seq, it.bookedDaysAgo),
        service: "booking",
        title: `Booking of ${v.en} on ${formatDate(date)}`,
        submittedAt: new Date(y, m - 1, d, 10, 30).toISOString(),
        status: it.status as Application["status"],
        applicant: user.name,
        amount: fees.total,
        details: {
          venue: v.id, date, slots: slots.join(","), start: hhmm(slots[0]), end: hhmm(slots[slots.length - 1] + SLOT_HOURS),
          hours: String(fees.hours), amenities: it.amenities.join(","), purpose: it.purpose, attendees: String(it.attendees),
          mobile: user.mobile, hire: String(fees.hire), amenityFee: String(fees.amenities), deposit: String(fees.deposit),
          payBy: payByFor(bookedOn, date),
        },
      };
      out.push(app);
      if (isActive(app)) held.push(...toHeld([app]));
    }
  }
  return out;
}

/** Saved booking records plus the seeded ones not yet rewritten in this browser (a saved record wins). */
export function allBookings(stored: Application[], today: string): Application[] {
  const saved = stored.filter((a) => a.service === "booking");
  const refs = new Set(saved.map((a) => a.ref));
  return [...saved, ...seededBookings(today, saved).filter((a) => !refs.has(a.ref))];
}

// ── Moving ─────────────────────────────────────────────────────

/** A booking can be moved while it holds its slots and its day is still at least LEAD_DAYS ahead. */
export const canMove = (app: Application, today: string) => isActive(app) && app.details.date >= firstBookable(today);

/** The slots a booking of `count` slots takes when it starts at `start`. */
export const runFrom = (start: number, count: number) => Array.from({ length: count }, (_, i) => start + i * SLOT_HOURS);

export type MoveProblem = "outside" | "closed" | "hours" | "taken" | "same";

/**
 * Why the booking cannot start at `start` on `date` (keeping its length), or null when it can.
 * `held` must not include the booking itself (its own slots do not block the move).
 */
export function moveProblem(v: Venue, app: Application, date: string, start: number, today: string, held: HeldSlots[]): MoveProblem | null {
  const slots = runFrom(start, slotsOf(app).length);
  if (date === app.details.date && slots[0] === slotsOf(app)[0]) return "same";
  const status = dayStatus(v, date, today, held);
  if (status === "outside" || status === "closed") return status;
  const all = venueSlots(v);
  if (!slots.every((h) => all.includes(h))) return "hours";
  const taken = takenSlots(v, date, held);
  return slots.some((h) => taken.includes(h)) ? "taken" : null;
}

/** The same booking (same ref) on its new day and time, with the time, hours and charges rewritten. */
export function movedBooking(app: Application, v: Venue, date: string, start: number, title: string): Application {
  const slots = runFrom(start, slotsOf(app).length);
  const amenities = (app.details.amenities ?? "").split(",").filter(Boolean);
  const fees = bookingFees(v, slots, amenities);
  const bookedOn = toISODate(new Date(app.submittedAt));
  return {
    ...app,
    title,
    amount: fees.total,
    details: {
      ...app.details,
      date, slots: slots.join(","), start: hhmm(slots[0]), end: hhmm(slots[slots.length - 1] + SLOT_HOURS),
      hours: String(fees.hours), hire: String(fees.hire), amenityFee: String(fees.amenities), deposit: String(fees.deposit),
      payBy: [app.details.payBy || payByFor(bookedOn, date), addDays(date, -1)].sort()[0],
    },
  };
}

// ── Week board ─────────────────────────────────────────────────

const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
/** Monday of the week that holds `iso`. */
export const mondayOf = (iso: string) => addDays(iso, -((weekday(iso) + 6) % 7));
export const weekOf = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
/** Whether the previous / next week still has a day inside the booking window. */
export const weekNav = (monday: string, today: string) => ({
  prev: addDays(monday, -1) >= firstBookable(today),
  next: addDays(monday, 7) <= lastBookable(today),
});
