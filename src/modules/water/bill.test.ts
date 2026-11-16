import { describe, expect, it } from "vitest";
import water from "@/mock/data/water.json";
import { computeCharges, normalizeConsumerNo, slabBreakup, splitAmount } from "./bill";

const domestic = water.tariff.domestic;

describe("normalizeConsumerNo", () => {
  it.each([
    ["0201400731", "W02-014-00731"],
    ["w02 014 00731", "W02-014-00731"],
    [" W02-014-00731 ", "W02-014-00731"],
    ["02/014/00731", "W02-014-00731"],
  ])("%s → %s", (raw, out) => expect(normalizeConsumerNo(raw)).toBe(out));

  it.each(["", "020140073", "02014007311", "X0201400731", "02O1400731"])("rejects %s", (raw) => {
    expect(normalizeConsumerNo(raw)).toBeNull();
  });
});

describe("slab charges", () => {
  it("splits consumption across slabs", () => {
    expect(slabBreakup(24, domestic.slabs).map((l) => [l.from, l.to, l.units, l.amount])).toEqual([
      [0, 10, 10, 60],
      [10, 20, 10, 110],
      [20, 30, 4, 72],
    ]);
    expect(slabBreakup(38, domestic.slabs).at(-1)).toMatchObject({ from: 30, to: null, units: 8, amount: 220 });
    expect(slabBreakup(0, domestic.slabs)).toEqual([]);
  });

  it("adds sewerage, meter rent, arrears and a late fee on arrears only", () => {
    const opts = { seweragePercent: 25, latePercent: 2 };
    const c = computeCharges(24, domestic, { ...opts, arrears: 0 });
    expect(c).toMatchObject({ water: 242, sewerage: 60.5, meterRent: 30, arrears: 0, lateFee: 0, total: 332.5 });
    const d = computeCharges(38, domestic, { ...opts, arrears: 212.4 });
    expect(d.lateFee).toBe(4.25);
    expect(d.total).toBe(Math.round((d.water + d.sewerage + 30 + 212.4 + 4.25) * 100) / 100);
  });
});

describe("splitAmount", () => {
  it("splits symbol, rupees (Indian grouping) and paise", () => {
    expect(splitAmount(123456.5)).toEqual({ symbol: "₹", whole: "1,23,456", fraction: "50" });
    expect(splitAmount(0)).toEqual({ symbol: "₹", whole: "0", fraction: "00" });
  });
});
