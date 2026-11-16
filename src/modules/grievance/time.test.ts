import { describe, expect, it } from "vitest";
import { HOURS, formatTime, isSlotAllowed, parseValue, toValue } from "./time";

describe("inspection time slots", () => {
  it("skips the lunch hour and ends at 5:30 PM", () => {
    expect(HOURS).not.toContain(13);
    expect(isSlotAllowed(9, 0)).toBe(true);
    expect(isSlotAllowed(13, 0)).toBe(false);
    expect(isSlotAllowed(17, 30)).toBe(true);
    expect(isSlotAllowed(17, 45)).toBe(false);
    expect(isSlotAllowed(10, 20)).toBe(false);
  });

  it("formats 24-hour values on a 12-hour clock", () => {
    expect(toValue(9, 0)).toBe("09:00");
    expect(parseValue("14:30")).toEqual({ h: 14, m: 30 });
    expect(parseValue("2:30")).toBeNull();
    expect(formatTime("14:30", "AM", "PM")).toBe("02:30 PM");
    expect(formatTime("12:15", "AM", "PM")).toBe("12:15 PM");
    expect(formatTime("09:45", "AM", "PM")).toBe("09:45 AM");
    expect(formatTime("", "AM", "PM")).toBe("");
  });
});
