import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT, checkPhoto, validateGrievance } from "./validate";

const OK = { category: "roads", ward: "W14", description: "Large pothole in front of house no. 12 near the bus stop.", time: "10:30", name: "Meena R", mobile: "9841023456" };

describe("grievance validation", () => {
  it("accepts a complete draft", () => {
    expect(validateGrievance(OK)).toEqual({});
  });

  it("reports every missing field except the ward", () => {
    expect(validateGrievance(EMPTY_DRAFT)).toEqual({
      category: "gr.errCategory", description: "gr.errDescShort", time: "gr.errTime", name: "gr.errName", mobile: "gr.errMobile",
    });
  });

  it("checks description length, time slot and mobile", () => {
    expect(validateGrievance({ ...OK, description: "   too short   " }).description).toBe("gr.errDescShort");
    expect(validateGrievance({ ...OK, description: "x".repeat(1001) }).description).toBe("gr.errDescLong");
    expect(validateGrievance({ ...OK, time: "13:00" }).time).toBe("gr.errTime");
    expect(validateGrievance({ ...OK, mobile: "5841023456" }).mobile).toBe("gr.errMobile");
  });

  it("accepts JPG/PNG photos up to 2 MB", () => {
    expect(checkPhoto({ type: "image/jpeg", size: 500_000 })).toBeNull();
    expect(checkPhoto({ type: "application/pdf", size: 1000 })).toBe("gr.errPhotoType");
    expect(checkPhoto({ type: "image/png", size: 3 * 1024 * 1024 })).toBe("gr.errPhotoSize");
  });
});
