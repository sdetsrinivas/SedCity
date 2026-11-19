import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/format";
import {
  EMPTY_BOOKING, MAX_SLOTS, VENUES, bookingFees, dayStatus, firstAvailableDay, firstBookable, freeSlots, lastBookable,
  monthGrid, monthOf, moveDay, slotLabel, takenSlots, toggleSlot, validateBooking, venueById, venueSlots,
} from "./booking";
import { bookingDays } from "../../../verification/booking-dates";

const V01 = venueById("V01")!;
const V04 = venueById("V04")!;

/** Every "today" from 2026-01-01 for `n` days. */
const todays = (n: number) => Array.from({ length: n }, (_, i) => addDays("2026-01-01", i));

describe("venues and slots", () => {
  it("every venue offers known amenities and whole two-hour slots", () => {
    for (const v of VENUES) {
      expect(venueSlots(v).length).toBe((v.close - v.open) / 2);
      expect(v.amenities.length).toBeGreaterThan(0);
    }
    expect(venueSlots(V04)).toEqual([6, 8, 10, 12, 14, 16]);
    expect(slotLabel(8)).toBe("08:00 – 10:00");
  });

  it("slots held by saved bookings are taken, on that venue and day only", () => {
    const day = "2026-12-10";
    const free = freeSlots(V01, day);
    const held = [{ venue: "V01", date: day, slots: free.slice(0, 1) }];
    expect(takenSlots(V01, day, held)).toContain(free[0]);
    expect(takenSlots(V01, addDays(day, 1), held)).toEqual(takenSlots(V01, addDays(day, 1)));
    expect(takenSlots(venueById("V02")!, day, held)).toEqual(takenSlots(venueById("V02")!, day));
  });
});

describe("booking days", () => {
  it("the window is today + 2 … today + 60, and the closed day is closed", () => {
    const today = "2026-11-19";
    expect(dayStatus(V01, addDays(today, 1), today)).toBe("outside");
    expect(dayStatus(V01, addDays(today, 61), today)).toBe("outside");
    // V01 is closed on Tuesdays: 24/11/2026 was a Tuesday.
    expect(dayStatus(V01, "2026-11-24", today)).toBe("closed");
  });

  it("a day with every slot held is fully booked", () => {
    const today = "2026-11-19";
    const day = firstAvailableDay(V01, today)!;
    const held = [{ venue: "V01", date: day, slots: venueSlots(V01) }];
    expect(dayStatus(V01, day, today, held)).toBe("full");
    expect(firstAvailableDay(V01, today, held)).not.toBe(day);
  });

  it("for every today over two years, each venue has a bookable day early in the window", () => {
    for (const today of todays(730)) {
      for (const v of VENUES) {
        const first = firstAvailableDay(v, today);
        expect(first, `${v.id} ${today}`).not.toBeNull();
        expect(first! >= firstBookable(today) && first! <= addDays(today, 12), `${v.id} ${today}`).toBe(true);
      }
    }
  });

  it("month grids are whole Monday-first weeks that include neighbouring days", () => {
    for (const today of todays(400)) {
      const month = monthOf(today);
      const weeks = monthGrid(month);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
      const flat = weeks.flat();
      expect(flat.filter((d) => monthOf(d) === month).length).toBe(new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate());
      expect(new Date(`${flat[0]}T12:00:00`).getDay()).toBe(1);
      expect(new Date(`${flat[flat.length - 1]}T12:00:00`).getDay()).toBe(0);
      for (let i = 1; i < flat.length; i++) expect(flat[i]).toBe(addDays(flat[i - 1], 1));
    }
  });

  it("keyboard moves skip unavailable days and stay inside the window", () => {
    for (const today of todays(400)) {
      const first = firstAvailableDay(V01, today)!;
      expect(moveDay(V01, first, "ArrowLeft", today)).toBeNull();
      const right = moveDay(V01, first, "ArrowRight", today)!;
      expect(right > first).toBe(true);
      expect(dayStatus(V01, right, today)).toBeNull();
      for (let d = addDays(first, 1); d < right; d = addDays(d, 1)) expect(dayStatus(V01, d, today)).not.toBeNull();
      const down = moveDay(V01, first, "PageDown", today);
      expect(down === null || (down > first && down <= lastBookable(today) && !dayStatus(V01, down, today))).toBe(true);
      expect(moveDay(V01, lastBookable(today), "ArrowRight", today)).toBeNull();
    }
  });
});

describe("slot selection", () => {
  it("builds one run of consecutive slots, at most four", () => {
    let sel: number[] = [];
    sel = toggleSlot(sel, 10, []).selected;
    sel = toggleSlot(sel, 12, []).selected;
    sel = toggleSlot(sel, 8, []).selected;
    expect(sel).toEqual([8, 10, 12]);
    sel = toggleSlot(sel, 14, []).selected;
    expect(sel).toHaveLength(MAX_SLOTS);
    expect(toggleSlot(sel, 16, [])).toEqual({ selected: sel, note: "max" });
    expect(toggleSlot(sel, 8, []).selected).toEqual([10, 12, 14]);
    expect(toggleSlot(sel, 14, []).selected).toEqual([8, 10, 12]);
    expect(toggleSlot(sel, 10, []).selected).toEqual([10]);
    expect(toggleSlot(sel, 20, []).selected).toEqual([20]);
  });

  it("a taken slot changes nothing", () => {
    expect(toggleSlot([8], 10, [10])).toEqual({ selected: [8], note: "taken" });
  });
});

describe("fees and validation", () => {
  it("adds hire per hour, amenities and the deposit", () => {
    expect(bookingFees(V01, [8, 10], ["sound", "chairs"])).toEqual({ hours: 4, hire: 2400, amenities: 1050, deposit: 5000, total: 8450 });
  });

  it("reports every problem with its variables", () => {
    const today = "2026-11-19";
    expect(Object.keys(validateBooking(EMPTY_BOOKING, today)).sort()).toEqual(["attendees", "date", "purpose", "venue"]);
    const day = firstAvailableDay(V01, today)!;
    const e = validateBooking({ ...EMPTY_BOOKING, venue: "V01", date: day, purpose: "abc", attendees: "301" }, today);
    expect(e.slots).toEqual({ key: "bk.errSlots" });
    expect(e.purpose).toEqual({ key: "bk.errPurpose", vars: { min: 5 } });
    expect(e.attendees).toEqual({ key: "bk.errAttendeesMax", vars: { capacity: 300 } });
    const free = freeSlots(V01, day);
    expect(validateBooking({ ...EMPTY_BOOKING, venue: "V01", date: day, slots: [free[0]], purpose: "Family get-together", attendees: "120" }, today)).toEqual({});
  });
});

describe("verification day picks", () => {
  it("finds every day the booking checks need, for every today over two years", () => {
    for (const today of todays(730)) {
      const p = bookingDays(today);
      expect(p, today).not.toBeNull();
      const { first, second, nextMonth, closed, other } = p!;
      expect(dayStatus(V01, first, today)).toBeNull();
      expect(dayStatus(V01, second, today)).toBeNull();
      expect(second > first).toBe(true);
      expect(dayStatus(V01, nextMonth, today)).toBeNull();
      expect(monthOf(nextMonth)).not.toBe(monthOf(first));
      expect(dayStatus(V01, closed, today)).not.toBeNull();
      expect(monthOf(closed)).toBe(monthOf(first));
      if (other) {
        expect(monthOf(other)).not.toBe(monthOf(first));
        expect(monthGrid(monthOf(first)).flat()).toContain(other);
      } else {
        // Only a month made of whole weeks (a 28-day February starting on a Monday) has no neighbouring days.
        expect(monthOf(first).endsWith("-02")).toBe(true);
      }
      expect(freeSlots(V01, first).length).toBeGreaterThan(0);
    }
  });
});
