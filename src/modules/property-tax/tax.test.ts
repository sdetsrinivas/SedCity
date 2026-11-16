import { describe, expect, it } from "vitest";
import { computeTax, depreciationRate, floorArv, halfYearOf, normalizeAssessmentNo, parseArea, unitAreaValue, type Floor } from "./tax";

const floors: Floor[] = [
  { id: "a", level: 0, area: 850, occupancy: "self" },
  { id: "b", level: 1, area: 620, occupancy: "rented" },
];

describe("property tax", () => {
  it("depreciates by building age in slabs", () => {
    expect([0, 10, 11, 25, 26, 40, 41, 80].map(depreciationRate)).toEqual([0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
  });

  it("scales the unit area value by usage and the ARV by occupancy", () => {
    expect(unitAreaValue(3.1, "residential")).toBe(3.1);
    expect(unitAreaValue(3.1, "mixed")).toBe(4.65);
    expect(unitAreaValue(3.1, "commercial")).toBe(7.75);
    expect(floorArv(floors[0], 3.1)).toBe(31620);
    expect(floorArv(floors[1], 3.1)).toBe(34596);
    expect(floorArv({ ...floors[0], area: null }, 3.1)).toBe(0);
  });

  it("computes the half-yearly amount payable", () => {
    const t = computeTax({ floors, baseRate: 3.1, usage: "residential", age: 17, rebates: [] });
    expect(t).toMatchObject({ arv: 66216, depreciationRate: 0.1, depreciation: 6621.6, netArv: 59594.4, annualTax: 5959.44, halfYearTax: 2979.72, rebate: 0, payable: 2980 });
    const r = computeTax({ floors, baseRate: 3.1, usage: "residential", age: 17, rebates: ["senior", "solar"] });
    expect(r.rebateRate).toBe(0.08);
    expect(r.rebate).toBe(238.38);
    expect(r.payable).toBe(2741);
  });

  it("knows the half-year and its due date", () => {
    expect(halfYearOf(new Date(2026, 10, 16))).toEqual({ half: 2, fy: "2026-27", dueISO: "2027-03-31" });
    expect(halfYearOf(new Date(2027, 1, 2))).toEqual({ half: 2, fy: "2026-27", dueISO: "2027-03-31" });
    expect(halfYearOf(new Date(2026, 3, 1))).toEqual({ half: 1, fy: "2026-27", dueISO: "2026-09-30" });
    expect(halfYearOf(new Date(2099, 8, 30)).fy).toBe("2099-00");
  });

  it("parses areas and assessment numbers", () => {
    expect(parseArea("1,200")).toBe(1200);
    expect(parseArea(" 50 ")).toBe(50);
    expect(parseArea("49")).toBeNull();
    expect(parseArea("12.5")).toBeNull();
    expect(parseArea("20001")).toBeNull();
    expect(normalizeAssessmentNo("014-002-00731")).toBe("014-002-00731");
    expect(normalizeAssessmentNo("01400200731")).toBe("014-002-00731");
    expect(normalizeAssessmentNo("014-002-0073")).toBeNull();
  });
});
