import {
  dayStatus, firstAvailableDay, freeSlots, monthGrid, monthOf, moveDay, shiftMonth, venueById,
} from "../src/modules/bookings/booking";

/** The venue the booking checks use (closed on Tuesdays, open 06:00–22:00). */
export const VENUE_ID = "V01";
export const VENUE_NAME = "Kalaivani Nagar Community Hall";

/**
 * DAT-02 / OTH-21: the days the booking checks use, worked out for any `today` (the window, month ends and
 * the "booked by others" pattern all move with it). Every search is bounded by the booking window or the
 * month grid, so this always returns; null only if the venue had nothing bookable at all.
 */
export function bookingDays(today: string) {
  const v = venueById(VENUE_ID)!;
  /** Focused when the calendar opens; the calendar opens on its month. */
  const first = firstAvailableDay(v, today);
  if (!first) return null;
  const opens = monthOf(first);
  /** Where ArrowRight from the first day lands (the next bookable day). */
  const second = moveDay(v, first, "ArrowRight", today);
  /** First bookable day of the following month (reached with the "Next month" button). */
  const next = firstAvailableDay(v, today, [], `${shiftMonth(opens, 1)}-01`);
  const nextMonth = next && monthOf(next) === shiftMonth(opens, 1) ? next : null;
  const grid = monthGrid(opens).flat();
  /** A day of the opening month that cannot be booked (there is always a Tuesday). */
  const closed = grid.find((d) => monthOf(d) === opens && dayStatus(v, d, today) !== null) ?? null;
  /** A day of a neighbouring month shown in the opening month's grid (none when the month is whole weeks). */
  const other = grid.find((d) => monthOf(d) !== opens) ?? null;
  /** A bookable day of the next month shown in the opening month's grid, if any. */
  const otherBookable = grid.find((d) => monthOf(d) > opens && dayStatus(v, d, today) === null) ?? null;
  if (!second || !nextMonth || !closed) return null;
  return { first, second, nextMonth, closed, other, otherBookable, free: freeSlots(v, first) };
}
