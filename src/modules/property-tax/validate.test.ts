import { describe, expect, it } from "vitest";
import { validateDraft } from "./validate";
import type { Draft } from "./types";

const record = { no: "014-002-00731", owner: { en: "M", ta: "M" }, address: "", ward: { en: "", ta: "" }, usage: "residential" as const, builtYear: 2009, floors: [], paidReceipt: null };
const complete: Draft = {
  assessmentNo: "014-002-00731", check: "found", record, localityId: "W14", usage: "residential", age: 17,
  floors: [{ id: "f1", level: 0, area: 850, occupancy: "self" }], rebates: [], method: "upi",
};

describe("validateDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateDraft(complete)).toEqual({});
  });

  it("reports each missing piece", () => {
    const e = validateDraft({ ...complete, check: "idle", record: null, localityId: "", usage: null, floors: [], method: null });
    expect(e).toEqual({ assessment: "pt.errAssessment", locality: "pt.errLocality", usage: "pt.errUsage", floors: "pt.errFloors", method: "pt.errMethod" });
  });

  it("explains an unfinished check, a paid half-year and a floor without area", () => {
    expect(validateDraft({ ...complete, check: "checking" }).assessment).toBe("pt.errChecking");
    expect(validateDraft({ ...complete, check: "paid" }).assessment).toBe("pt.errPaid");
    expect(validateDraft({ ...complete, floors: [...complete.floors, { id: "f2", level: 1, area: null, occupancy: "self" }] }).floors).toBe("pt.errFloors");
  });
});
