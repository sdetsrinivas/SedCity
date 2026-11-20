import { venueById, venueSlots } from "../src/modules/bookings/booking";
import { mondayOf, moveProblem, seededBookings, sortBookings, toHeld, weekOf } from "../src/modules/bookings/manage";

/** The seeded booking the move checks use: meena.r's rebooking at Lake Road Kalyana Mandapam (V02). */
export const MOVE_SEQ = "004719";

/**
 * OTH-03 / TBL-08: the cells of the moved booking's week worked out for any `today` (the seeded bookings
 * are placed relative to it). Bounded by one week of the venue's slots; every field is checked for two
 * years of `today` values in manage.test.ts. Assumes a fresh browser (no bookings saved there).
 */
export function moveCase(today: string) {
  const apps = seededBookings(today);
  const booking = apps.find((a) => a.ref.endsWith(`/${MOVE_SEQ}`))!;
  const v = venueById(booking.details.venue)!;
  const held = toHeld(apps).filter((h) => h.ref !== booking.ref);
  const monday = mondayOf(booking.details.date);
  const cells = weekOf(monday).flatMap((date) => venueSlots(v).map((hour) => ({ date, hour })));
  const problem = (c: { date: string; hour: number }) => moveProblem(v, booking, c.date, c.hour, today, held);
  const free = cells.filter((c) => problem(c) === null);
  /** A free target, on an earlier day of the week if there is one (the row then moves up the table). */
  const target = free.find((c) => c.date < booking.details.date) ?? free.find((c) => c.date !== booking.details.date) ?? free[0];
  /** A second free target for the keyboard check (another one than `target`). */
  const other = free.find((c) => c !== target) ?? null;
  const taken = cells.find((c) => problem(c) === "taken") ?? null;
  const closed = cells.find((c) => problem(c) === "closed") ?? null;
  const mine = sortBookings(apps.filter((a) => a.details.mobile === booking.details.mobile));
  return { booking, venue: v, monday, target: target ?? null, other, taken, closed, mine, apps };
}
