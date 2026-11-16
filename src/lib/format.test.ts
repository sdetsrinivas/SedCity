import { describe, expect, it } from "vitest";
import { addDays, formatDate, formatINR, parseDDMMYYYY, toISODate } from "./format";

describe("format helpers", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(1234567.5)).toBe("₹12,34,567.50");
    expect(formatINR(950, true)).toBe("₹950");
  });
  it("formats and parses DD/MM/YYYY", () => {
    expect(formatDate("2026-11-05")).toBe("05/11/2026");
    expect(formatDate("2026-11-05T10:00:00Z")).toBe("05/11/2026");
    expect(formatDate("bad")).toBe("");
    expect(parseDDMMYYYY("05/11/2026")).toBe("2026-11-05");
    expect(parseDDMMYYYY(" 29/02/2028 ")).toBe("2028-02-29");
  });
  it.each(["31/11/2026", "29/02/2027", "5/11/2026", "2026-11-05", "00/01/2026", "12/13/2026"])("rejects %s", (s) => {
    expect(parseDDMMYYYY(s)).toBeNull();
  });
  it("adds days across month and year boundaries in local time", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(toISODate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
});
