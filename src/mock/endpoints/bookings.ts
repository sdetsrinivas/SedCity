import { call } from "../api";
import { listApplications, saveApplication, type Application } from "@/lib/applications";
import { todayISO } from "@/lib/format";
import { dayStatus, takenSlots, venueById, venueSlots, type DayStatus, type HeldSlots } from "@/modules/bookings/booking";
import { allBookings, isMine, moveProblem, movedBooking, sortBookings, toHeld, weekOf, type MoveProblem } from "@/modules/bookings/manage";

/**
 * Slots held by bookings: the ones saved in this browser (service "booking", details.slots like "8,10")
 * and the seeded bookings of the demo citizens that have not been rewritten here. A lapsed booking
 * (status Rejected) holds nothing.
 */
export function heldSlots(apps: Application[] = listApplications(), today = todayISO()): HeldSlots[] {
  return toHeld(allBookings(apps, today));
}

export interface SlotAvailability {
  /** Start hours of every slot of the venue, in order. */
  slots: number[];
  /** Start hours that are already booked. */
  taken: number[];
}

/** Availability of a venue's slots on one day (BOOKING_SLOTS). */
export const fetchSlots = (venueId: string, date: string) =>
  call("BOOKING_SLOTS", (): SlotAvailability => {
    const v = venueById(venueId);
    if (!v) return { slots: [], taken: [] };
    return { slots: venueSlots(v), taken: takenSlots(v, date, heldSlots()) };
  });

export interface BookingPayload {
  venue: string;
  date: string;
  slots: number[];
  amenities: string[];
  purpose: string;
  attendees: number;
}

/**
 * Books the slots (BOOKING_SUBMIT). Answers `taken` when one of them was booked in the meantime
 * (e.g. from another tab), so nothing is saved.
 */
export const submitBooking = (p: BookingPayload) =>
  call("BOOKING_SUBMIT", () => {
    const v = venueById(p.venue);
    const taken = v ? takenSlots(v, p.date, heldSlots()) : [];
    if (!v || p.slots.some((h) => taken.includes(h))) return { ok: false as const, reason: "taken" as const };
    return { ok: true as const, payWithinDays: 3 };
  });

// ── My bookings (module 10 part B) ─────────────────────────────

/** The signed-in citizen's bookings, by date and time (MY_BOOKINGS). */
export const fetchMyBookings = (mobile: string) =>
  call("MY_BOOKINGS", () => sortBookings(allBookings(listApplications(), todayISO()).filter((a) => isMine(a, mobile))));

export interface BoardDay {
  date: string;
  /** Why the day cannot take a booking ("full" is shown through `taken`). */
  status: Exclude<DayStatus, "full"> | null;
  /** Start hours booked by others (the booking being moved does not count). */
  taken: number[];
}

/** A week of the venue's availability for moving booking `ref` (BOOKING_WEEK). */
export const fetchWeek = (venueId: string, monday: string, ref: string) =>
  call("BOOKING_WEEK", (): BoardDay[] => {
    const v = venueById(venueId);
    const today = todayISO();
    const held = heldSlots().filter((h) => h.ref !== ref);
    return weekOf(monday).map((date) => {
      const st = v ? dayStatus(v, date, today, held) : "outside";
      const open = st === null || st === "full";
      return { date, status: open ? null : st, taken: v && open ? takenSlots(v, date, held) : [] };
    });
  });

export type MoveResult = { ok: true; booking: Application } | { ok: false; reason: MoveProblem | "missing" };

/**
 * Moves booking `ref` to `date`, starting at `start` and keeping its length (BOOKING_MOVE). The target is
 * checked again here against every other booking; on success the same record (same ref) is rewritten.
 */
export const moveBooking = (ref: string, date: string, start: number, title: string) =>
  call("BOOKING_MOVE", (): MoveResult => {
    const today = todayISO();
    const stored = listApplications();
    const app = allBookings(stored, today).find((a) => a.ref === ref);
    const v = app && venueById(app.details.venue);
    if (!app || !v || app.status === "Rejected") return { ok: false, reason: "missing" };
    const problem = moveProblem(v, app, date, start, today, heldSlots(stored, today).filter((h) => h.ref !== ref));
    if (problem) return { ok: false, reason: problem };
    const booking = movedBooking(app, v, date, start, title);
    saveApplication(booking);
    return { ok: true, booking };
  });
