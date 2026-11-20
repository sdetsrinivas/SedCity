import { call } from "../api";
import { listApplications, type Application } from "@/lib/applications";
import { takenSlots, venueById, venueSlots, type HeldSlots } from "@/modules/bookings/booking";

/** Statuses that no longer hold their slots. */
const RELEASED: Application["status"][] = ["Rejected"];

/** Slots held by the bookings saved in this browser (service "booking", details.slots like "8,10"). */
export function heldSlots(apps: Application[] = listApplications()): HeldSlots[] {
  return apps
    .filter((a) => a.service === "booking" && !RELEASED.includes(a.status))
    .map((a) => ({
      venue: a.details.venue,
      date: a.details.date,
      slots: (a.details.slots ?? "").split(",").filter(Boolean).map(Number),
    }));
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
