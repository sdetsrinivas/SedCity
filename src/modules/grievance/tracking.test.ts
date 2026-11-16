import { describe, expect, it } from "vitest";
import {
  clampToWindow, firstAvailable, isFullyBooked, monthWeeks, moveDate, normaliseRefInput, shiftMonth, unavailableReason, validateRef,
} from "./tracking";

const TODAY = "2026-11-16"; // a Monday

describe("grievance number (TXT-05)", () => {
  it("normalises typing: upper case, no spaces, 18 characters", () => {
    expect(normaliseRefInput("amc/gr/2026/ 004598")).toBe("AMC/GR/2026/004598");
    expect(normaliseRefInput("AMC/GR/2026/0045981234")).toBe("AMC/GR/2026/004598");
  });
  it("validates the format", () => {
    expect(validateRef("")).toBe("gt.errRefEmpty");
    expect(validateRef("AMC/GR/2026/45")).toBe("gt.errRefFormat");
    expect(validateRef("AMC/EL/2026/004598")).toBe("gt.errRefFormat");
    expect(validateRef("AMC/GR/2026/004598")).toBeNull();
  });
});

describe("inspection dates (DAT-06)", () => {
  it.each([
    ["2026-11-16", "outside"], // today
    ["2026-11-10", "outside"],
    ["2026-12-17", "outside"], // today + 31
    ["2026-11-22", "sunday"],
    ["2026-11-14", "outside"],
    ["2026-11-28", "saturday"], // 4th Saturday
    ["2026-12-12", "saturday"], // 2nd Saturday
    ["2026-11-27", "holiday"],
    ["2026-11-23", "full"],
  ])("%s → %s", (iso, kind) => expect(unavailableReason(iso, TODAY)?.kind).toBe(kind));

  it("1st, 3rd and 5th Saturdays are working days", () => {
    expect(unavailableReason("2026-11-21", TODAY)).toBeNull();
    expect(unavailableReason("2026-12-05", TODAY)).toBeNull();
  });

  it("names the holiday and the Saturday", () => {
    expect(unavailableReason("2026-11-27", TODAY)).toMatchObject({ kind: "holiday", holiday: { en: "Astheenapuram Foundation Day" } });
    expect(unavailableReason("2026-12-12", TODAY)).toEqual({ kind: "saturday", nth: 2 });
  });

  it("fully booked days follow a fixed pattern", () => {
    expect(isFullyBooked("2026-11-23")).toBe(true);
    expect(isFullyBooked("2026-11-24")).toBe(false);
  });

  it("finds the first available date", () => {
    expect(firstAvailable("2026-11-01", TODAY)).toBe("2026-11-17");
    expect(firstAvailable("2026-11-22", TODAY)).toBe("2026-11-25");
    expect(firstAvailable("2026-12-20", TODAY)).toBeNull();
  });

  it("lays out Monday-first weeks", () => {
    const weeks = monthWeeks("2026-11");
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("moves by keyboard and clamps to the window", () => {
    expect(moveDate("2026-11-30", "ArrowRight")).toBe("2026-12-01");
    expect(moveDate("2026-11-18", "ArrowUp")).toBe("2026-11-11");
    expect(moveDate("2026-11-18", "Home")).toBe("2026-11-16");
    expect(moveDate("2026-11-18", "End")).toBe("2026-11-22");
    expect(moveDate("2027-01-31", "PageDown")).toBe("2027-02-28");
    expect(moveDate("2026-11-18", "Tab")).toBeNull();
    expect(clampToWindow("2026-11-11", TODAY)).toBe("2026-11-17");
    expect(clampToWindow("2027-01-11", TODAY)).toBe("2026-12-16");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
