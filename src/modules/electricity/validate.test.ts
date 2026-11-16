import { describe, expect, it } from "vitest";
import { validateStep } from "./validate";
import { EMPTY_DRAFT, type Draft } from "./types";
import { computeEstimate, validateLoad } from "@/mock/endpoints/electricity";

const range = { min: "2026-11-16", max: "2026-12-15" };
const full: Draft = {
  ...EMPTY_DRAFT, connType: "domestic", phase: "single", load: "5", name: "Meena Rajendran", astheenId: "ASP-4821-7730-6",
  mobile: "+91 98410 23456", zoneId: "Z2", wardId: "W14", streetId: "W14-S01", door: "12", inspectionDate: "2026-11-20",
  idProof: { name: "a.pdf", size: 1, type: "application/pdf" }, ownershipProof: { name: "b.pdf", size: 1, type: "application/pdf" },
};

describe("electricity wizard validation", () => {
  it("a complete draft passes steps 1–4, and step 5 needs the declaration", () => {
    for (const step of [1, 2, 3, 4]) expect(validateStep(step, full, range), `step ${step}`).toEqual({});
    expect(validateStep(5, full, range)).toEqual({ declare: "el.errDeclare" });
    expect(validateStep(5, full, range, true)).toEqual({});
  });
  it("reports every missing field on an empty draft", () => {
    expect(Object.keys(validateStep(1, EMPTY_DRAFT, range))).toEqual(["connType", "phase", "load"]);
    expect(Object.keys(validateStep(2, EMPTY_DRAFT, range))).toEqual(["name", "astheenId", "mobile"]);
    expect(Object.keys(validateStep(3, { ...full, streetId: "" }, range))).toEqual(["zoneId"]);
    expect(Object.keys(validateStep(4, EMPTY_DRAFT, range))).toEqual(["inspectionDate", "idProof", "ownershipProof"]);
  });
  it("enforces the inspection date range inclusively", () => {
    expect(validateStep(4, { ...full, inspectionDate: range.min }, range)).toEqual({});
    expect(validateStep(4, { ...full, inspectionDate: range.max }, range)).toEqual({});
    expect(validateStep(4, { ...full, inspectionDate: "2026-11-15" }, range).inspectionDate).toBe("el.errDate");
    expect(validateStep(4, { ...full, inspectionDate: "2026-12-16" }, range).inspectionDate).toBe("el.errDate");
  });
  it("load rules: range, single-phase and domestic caps", () => {
    expect(validateLoad("domestic", "single", "7")).toBeNull();
    expect(validateLoad("domestic", "single", "7.5")).toBe("el.errSinglePhase");
    expect(validateLoad("domestic", "three", "16")).toBe("el.errDomesticLoad");
    expect(validateLoad("industrial", "three", "100")).toBeNull();
    expect(validateLoad("industrial", "three", "101")).toBe("el.errLoad");
    expect(validateLoad("commercial", "three", "")).toBe("el.errLoad");
    expect(validateLoad("commercial", "three", "0")).toBe("el.errLoad");
  });
  it("estimates charges (deposit rounds load up)", () => {
    expect(computeEstimate("domestic", "single", 5)).toEqual({ deposit: 1500, serviceCharge: 1500, applicationFee: 100, total: 3100 });
    expect(computeEstimate("commercial", "three", 10.5).deposit).toBe(11000);
  });
});
