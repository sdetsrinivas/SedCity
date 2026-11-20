import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/format";
import { allBookings, isMine } from "@/modules/bookings/manage";
import type { Application } from "@/lib/applications";
import {
  CHART, barBoxes, browserPayments, dashboardApplications, dayMonthsAgo, dropIndex, earliestDay, inRange, monthRange, monthlyTotals,
  monthsBetween, moveItem, niceMax, normaliseOrder, pickDay, presetRange, seededDocs, seededNotices, seededPayments, serviceTotals, shiftMonth,
} from "./data";

const MEENA = "9841023456";

describe("months", () => {
  it("shifts across years and clamps the day to the month", () => {
    expect(shiftMonth("2026-02", 3)).toBe("2025-11");
    expect(shiftMonth("2026-11", -2)).toBe("2027-01");
    expect(dayMonthsAgo("2026-03-31", 1, 31)).toBe("2026-02-28");
    expect(monthsBetween("2025-12-15", "2026-02-01")).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("builds presets, month ranges and the calendar's lower bound", () => {
    expect(presetRange("2026-11-20", 12)).toEqual({ from: "2025-12-01", to: "2026-11-20" });
    expect(presetRange("2026-01-05", 3)).toEqual({ from: "2025-11-01", to: "2026-01-05" });
    expect(monthRange("2026-02", "2026-11-20")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2026-11", "2026-11-20")).toEqual({ from: "2026-11-01", to: "2026-11-20" });
    expect(earliestDay("2026-11-20")).toBe("2024-12-01");
  });

  it("picks a range in two clicks; an earlier day or a third click starts again", () => {
    let sel = pickDay({ from: null, to: null }, "2026-05-10");
    expect(sel).toEqual({ from: "2026-05-10", to: null });
    expect(pickDay(sel, "2026-05-01")).toEqual({ from: "2026-05-01", to: null });
    sel = pickDay(sel, "2026-06-02");
    expect(sel).toEqual({ from: "2026-05-10", to: "2026-06-02" });
    expect(pickDay(sel, "2026-07-01")).toEqual({ from: "2026-07-01", to: null });
    expect(pickDay({ from: "2026-05-10", to: null }, "2026-05-10")).toEqual({ from: "2026-05-10", to: "2026-05-10" });
  });
});

describe("seeded records", () => {
  it("never dates a payment after today and keeps receipt numbers unique, for every day of two years", () => {
    for (let today = "2026-01-01"; today <= "2027-12-31"; today = addDays(today, 1)) {
      for (const u of ["meena.r", "arul.k"]) {
        const ps = seededPayments(u, today);
        expect(ps.every((p) => p.date <= today)).toBe(true);
        expect(new Set(ps.map((p) => p.ref)).size).toBe(ps.length);
        // A payment receipt never shares a number with one of the citizen's bookings.
        const bookingRefs = new Set(allBookings([], today).map((b) => b.ref));
        expect(ps.some((p) => bookingRefs.has(p.ref))).toBe(false);
        // The default period (last 12 months) always has payments.
        expect(ps.filter((p) => inRange(p.date, presetRange(today, 12))).length).toBeGreaterThan(5);
      }
    }
  });

  it("lists payments newest first and gives meena.r twelve monthly water payments", () => {
    const ps = seededPayments("meena.r", "2026-11-20");
    expect(ps.map((p) => p.date)).toEqual([...ps.map((p) => p.date)].sort().reverse());
    expect(ps.filter((p) => p.service === "water")).toHaveLength(12);
    expect(ps[0]).toMatchObject({ date: "2026-11-06", service: "water", amount: 332.5, ref: "AMC/WT/2026/003377" });
    expect(seededPayments("someone.else", "2026-11-20")).toEqual([]);
  });

  it("places notifications and documents relative to today", () => {
    const ns = seededNotices("meena.r", "2026-11-20");
    expect(ns).toHaveLength(6);
    expect(ns.filter((n) => n.unread)).toHaveLength(3);
    expect(ns[0].at).toBe("2026-11-20T08:15:00");
    expect(seededDocs("meena.r", "2026-11-20")[0]).toMatchObject({ id: "DOC-7731", date: "2026-11-15" });
  });

  it("adds payments made in this browser", () => {
    const paid: Application = {
      ref: "AMC/WT/2026/004901", service: "water", title: "x", submittedAt: "2026-11-19T06:30:00.000Z", status: "Paid", amount: 340,
      details: { consumerNo: "W02-014-00731", method: "card" },
    };
    expect(browserPayments([paid, { ...paid, ref: "y", status: "Submitted" }])).toEqual([
      { ref: paid.ref, date: expect.stringMatching(/^2026-11-19$/), service: "water", detail: "W02-014-00731", method: "card", amount: 340 },
    ]);
  });
});

describe("totals", () => {
  const ps = seededPayments("meena.r", "2026-11-20");
  it("sums each month of the range and only payments inside it", () => {
    const r = { from: "2026-04-15", to: "2026-06-30" };
    const totals = monthlyTotals(ps, r);
    expect(totals.map((m) => m.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    // 06/04 water is before the 15th, so April only has the property tax of 21/04.
    expect(totals[0].total).toBe(4862);
    expect(totals.reduce((s, m) => s + m.total, 0)).toBeCloseTo(ps.filter((p) => inRange(p.date, r)).reduce((s, p) => s + p.amount, 0));
  });

  it("sums by service, leaving out services without payments", () => {
    expect(serviceTotals(ps).map((x) => x.service)).toEqual(["water", "property-tax", "booking"]);
    expect(serviceTotals(ps).find((x) => x.service === "property-tax")).toEqual({ service: "property-tax", total: 9724, count: 2 });
  });

  it("scales bars to a round maximum", () => {
    expect([niceMax(0), niceMax(4862), niceMax(1999), niceMax(250)]).toEqual([1000, 5000, 2000, 250]);
    const boxes = barBoxes(600, [5000, 2500, 0]);
    const plotH = CHART.height - CHART.top - CHART.bottom;
    expect(boxes[0].h).toBe(plotH);
    expect(boxes[1].h).toBe(plotH / 2);
    expect(boxes[2].h).toBe(0);
    expect(boxes[0].y + boxes[0].h).toBe(CHART.top + plotH);
    expect(boxes[1].x - boxes[0].x).toBeCloseTo((600 - CHART.left - CHART.right) / 3);
  });
});

describe("applications", () => {
  it("shows the citizen's bookings (seeded ones too) next to the other applications, newest first", () => {
    const today = "2026-11-20";
    const other: Application = { ref: "AMC/EL/2026/004811", service: "electricity", title: "New connection", submittedAt: "2026-11-20T10:00:00Z", status: "Submitted", details: {} };
    const apps = dashboardApplications([other], MEENA, today);
    const mine = allBookings([], today).filter((a) => isMine(a, MEENA));
    expect(apps).toHaveLength(mine.length + 1);
    expect(apps.map((a) => a.submittedAt)).toEqual([...apps.map((a) => a.submittedAt)].sort().reverse());
    expect(apps.some((a) => a.ref === other.ref)).toBe(true);
  });

  it("shows a moved booking with its new date (the saved record wins over the seed)", () => {
    const today = "2026-11-20";
    const seed = allBookings([], today).find((a) => isMine(a, MEENA) && a.status !== "Rejected")!;
    const moved = { ...seed, details: { ...seed.details, date: addDays(seed.details.date, 3) } };
    const apps = dashboardApplications([moved], MEENA, today);
    expect(apps.filter((a) => a.ref === seed.ref)).toEqual([moved]);
  });
});

describe("card order", () => {
  it("repairs a saved order", () => {
    expect(normaliseOrder(["documents", "bogus", "documents", "payments"])).toEqual(["documents", "payments", "notifications", "applications"]);
    expect(normaliseOrder(null)).toEqual(["notifications", "applications", "payments", "documents"]);
  });

  it("drops a card in the place of the card whose middle it reached", () => {
    // Others' midpoints (dragging card 0 of [A,B,C,D]): B 150, C 250, D 350.
    expect(dropIndex([150, 250, 350], 250, true)).toBe(2); // onto C's middle → [B,C,A,D]
    expect(dropIndex([150, 250, 350], 240, true)).toBe(1);
    // Dragging D up ([A,B,C] at 50, 150, 250) onto B's middle → index 1.
    expect(dropIndex([50, 150, 250], 150, false)).toBe(1);
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
});
