import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications";
import { addDays } from "@/lib/format";
import { dayStatus, firstBookable, lastBookable, takenSlots, venueById } from "./booking";
import {
  allBookings, canMove, isMine, mondayOf, moveProblem, movedBooking, seededBookings, slotsOf, sortBookings, toHeld, weekNav, weekOf,
} from "./manage";
import { moveCase } from "../../../verification/booking-moves";

/** Every "today" from 2026-01-01 for `n` days (covers month ends, leap day 2028 is out of range). */
const todays = (n: number) => Array.from({ length: n }, (_, i) => addDays("2026-01-01", i));

describe("seeded bookings", () => {
  it("are placed inside the window, on open days and free slots, for every today over two years", () => {
    for (const today of todays(800)) {
      const apps = seededBookings(today);
      expect(apps.length, today).toBe(6);
      const active = apps.filter((a) => a.status !== "Rejected");
      for (const a of apps) {
        const v = venueById(a.details.venue)!;
        expect(a.details.date >= firstBookable(today) && a.details.date <= lastBookable(today), `${today} ${a.ref}`).toBe(true);
        expect(dayStatus(v, a.details.date, today), `${today} ${a.ref}`).not.toBe("closed");
        expect(a.details.payBy <= addDays(a.details.date, -1)).toBe(true);
        expect(canMove(a, today)).toBe(a.status !== "Rejected");
        // An active one is free of other citizens' bookings and of the other seeded bookings.
        if (a.status === "Rejected") continue;
        const others = toHeld(active.filter((b) => b.ref !== a.ref));
        const taken = takenSlots(v, a.details.date, others);
        expect(slotsOf(a).some((h) => taken.includes(h)), `${today} ${a.ref}`).toBe(false);
      }
      // The lapsed booking and its rebooking: same venue, date and time.
      const [lapsed, rebooked, park] = apps;
      expect([lapsed.details.venue, lapsed.details.date, lapsed.details.start]).toEqual([rebooked.details.venue, rebooked.details.date, rebooked.details.start]);
      expect([park.details.date, park.details.start]).toEqual([rebooked.details.date, rebooked.details.start]);
      expect(lapsed.status).toBe("Rejected");
    }
  });

  it("belong to their citizen and give way to a saved record with the same number", () => {
    const today = "2026-11-19";
    const seeds = seededBookings(today);
    expect(seeds.filter((a) => isMine(a, "+91 98410 23456")).length).toBe(5);
    expect(seeds.filter((a) => isMine(a, "9790011223")).length).toBe(1);
    const changed: Application = { ...seeds[1], details: { ...seeds[1].details, date: addDays(seeds[1].details.date, 1) } };
    const all = allBookings([changed], today);
    expect(all.filter((a) => a.ref === changed.ref)).toEqual([changed]);
    expect(all.length).toBe(6);
  });

  it("sorts by date, time and number", () => {
    const sorted = sortBookings(seededBookings("2026-11-19"));
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      expect(a.details.date < b.details.date || (a.details.date === b.details.date && (a.details.start < b.details.start || (a.details.start === b.details.start && a.ref < b.ref)))).toBe(true);
    }
  });
});

describe("moving a booking", () => {
  const today = "2026-11-19";
  const apps = seededBookings(today);
  const b = apps[1];
  const v = venueById(b.details.venue)!;
  const held = toHeld(apps).filter((h) => h.ref !== b.ref);

  it("reports the same place, closed days, days outside the window, closing time and booked slots", () => {
    expect(moveProblem(v, b, b.details.date, slotsOf(b)[0], today, held)).toBe("same");
    expect(moveProblem(v, b, addDays(today, 1), 8, today, held)).toBe("outside");
    const monday = mondayOf(b.details.date); // V02 is closed on Mondays
    expect(moveProblem(v, b, monday, 8, today, held)).toBe("closed");
    expect(moveProblem(v, b, b.details.date, 20, today, held)).toBe("hours"); // 20:00 + 4 hours is past 22:00
    // Its own slots do not block it: one slot earlier overlaps itself only.
    const earlier = moveProblem(v, b, b.details.date, slotsOf(b)[0] - 2, today, held);
    expect(earlier === null || earlier === "taken").toBe(true);
    if (earlier === null) expect(takenSlots(v, b.details.date, held)).not.toContain(slotsOf(b)[0] - 2);
  });

  it("rewrites the same record: date, slots, times, hours, hire and amount", () => {
    const m = movedBooking(b, v, "2026-12-30", 8, "Booking of X on 30/12/2026");
    expect(m.ref).toBe(b.ref);
    expect(m.details).toMatchObject({ date: "2026-12-30", slots: "8,10", start: "08:00", end: "12:00", hours: "4", hire: "3600" });
    expect(m.amount).toBe(b.amount);
    expect(m.title).toBe("Booking of X on 30/12/2026");
    expect(m.details.payBy <= "2026-12-29").toBe(true);
  });

  it("week navigation stays inside the window", () => {
    expect(weekOf("2026-11-23")).toHaveLength(7);
    expect(mondayOf("2026-11-29")).toBe("2026-11-23"); // a Sunday
    expect(weekNav(mondayOf(firstBookable(today)), today).prev).toBe(false);
    expect(weekNav(mondayOf(lastBookable(today)), today).next).toBe(false);
  });

  it("the verification move case has a free target, a booked cell and a closed day for every today over two years", () => {
    for (const t of todays(800)) {
      const c = moveCase(t);
      expect(c.target, t).not.toBeNull();
      expect(c.other, t).not.toBeNull();
      expect(c.taken, t).not.toBeNull();
      expect(c.closed, t).not.toBeNull();
      expect(c.target!.date >= c.monday && c.target!.date <= addDays(c.monday, 6)).toBe(true);
      expect(c.mine.length).toBe(5);
    }
  });
});
