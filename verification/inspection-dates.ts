import { addDays } from "../src/lib/format";
import { firstAvailable, isAvailable, monthOf, monthWeeks, WINDOW_DAYS } from "../src/modules/grievance/tracking";

/** Months from `from` to `to` ("YYYY-MM"), negative when `to` is earlier. */
export const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/**
 * DAT-06: the days the reschedule-calendar check uses, worked out for any `today` (the booking window,
 * month ends and the holiday list all move with it). Every search is bounded by the window or by the
 * months the calendar can show, so this always returns.
 */
export function calendarDays(today: string) {
  const last = addDays(today, WINDOW_DAYS);
  const window = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i + 1));
  /** Focused when the calendar opens; the calendar opens on its month. */
  const first = firstAvailable(addDays(today, 1), today);
  /** The inspection date the seeded grievance already has. */
  const current = firstAvailable(addDays(today, 2), today);
  if (!first) return null;
  const opens = monthOf(first);

  // An unavailable day inside the window, preferably in the month the calendar opens on.
  const offs = window.filter((d) => !isAvailable(d, today));
  const off = offs.find((d) => monthOf(d) === opens) ?? offs[0] ?? null;

  // A day outside the window in a month the calendar can show (there is none when the window covers
  // whole months exactly, e.g. today = 31 March: 1–30 April).
  const months = [...new Set([monthOf(addDays(today, 1)), monthOf(last)])];
  const outsides = months.flatMap((m) => monthWeeks(m).flat()).filter((d): d is string => !!d && (d <= today || d > last));
  const outside = outsides.find((d) => monthOf(d) === opens) ?? outsides[0] ?? null;

  // An available day after the first one that differs from the current inspection date.
  const target = window.find((d) => d > first && d !== current && isAvailable(d, today)) ?? null;

  return { first, current, off, outside, target };
}
