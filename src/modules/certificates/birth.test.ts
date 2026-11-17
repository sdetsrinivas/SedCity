import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/format";
import { DOB_MIN, EMPTY_BIRTH, NAME_MAX, OTHER_PLACE, birthFee, checkProof, validateBirth, type BirthDraft } from "./birth";

const TODAY = "2026-11-17";
const VALID: BirthDraft = {
  ...EMPTY_BIRTH, childName: "Kavin Arul", sex: "M", dob: "2026-11-02", hospital: "H02", motherName: "Divya Arul",
  applicantType: "1", applicantName: "Arul Kumar", mobile: "9840012345", delivery: "1", copies: "2",
};

describe("validateBirth", () => {
  it("accepts a complete application", () => {
    expect(validateBirth(VALID, true, TODAY)).toEqual({});
  });

  it("reports every missing field of an empty form, in form order", () => {
    expect(Object.keys(validateBirth(EMPTY_BIRTH, false, TODAY))).toEqual([
      "childName", "sex", "dob", "hospital", "motherName", "applicantType", "applicantName", "mobile", "proof", "delivery",
    ]);
  });

  it("checks the name length even when the input's maxlength was bypassed", () => {
    expect(validateBirth({ ...VALID, childName: "a".repeat(NAME_MAX) }, true, TODAY).childName).toBeUndefined();
    expect(validateBirth({ ...VALID, childName: "a".repeat(NAME_MAX + 1) }, true, TODAY).childName).toBe("bc.errChildNameLong");
  });

  it("keeps the date of birth between DOB_MIN and today", () => {
    expect(validateBirth({ ...VALID, dob: TODAY }, true, TODAY).dob).toBeUndefined();
    expect(validateBirth({ ...VALID, dob: "2026-11-18" }, true, TODAY).dob).toBe("bc.errDobFuture");
    expect(validateBirth({ ...VALID, dob: DOB_MIN }, true, TODAY).dob).toBeUndefined();
    expect(validateBirth({ ...VALID, dob: "1949-12-31" }, true, TODAY).dob).toBe("bc.errDobOld");
    expect(validateBirth({ ...VALID, dob: "17/11/2026" }, true, TODAY).dob).toBe("bc.errDob");
  });

  it("accepts yesterday and rejects tomorrow for every day of a year (month and year ends included)", () => {
    for (let i = 0; i < 366; i++) {
      const today = addDays("2026-01-01", i);
      expect(validateBirth({ ...VALID, dob: addDays(today, -1) }, true, today).dob, today).toBeUndefined();
      expect(validateBirth({ ...VALID, dob: today }, true, today).dob, today).toBeUndefined();
      expect(validateBirth({ ...VALID, dob: addDays(today, 1) }, true, today).dob, today).toBe("bc.errDobFuture");
    }
  });

  it("asks for the address when the birth was not in a listed hospital", () => {
    expect(validateBirth({ ...VALID, hospital: OTHER_PLACE }, true, TODAY).place).toBe("bc.errPlace");
    expect(validateBirth({ ...VALID, hospital: OTHER_PLACE, place: "12, Thendral Street" }, true, TODAY).place).toBeUndefined();
  });

  it("asks for the delivery details of the chosen mode only", () => {
    const post = validateBirth({ ...VALID, delivery: "2" }, true, TODAY);
    expect(post.address).toBe("bc.errAddress");
    expect(post.pin).toBe("bc.errPin");
    expect(post.email).toBeUndefined();
    expect(validateBirth({ ...VALID, delivery: "2", address: "12, Thendral Street, Ward 14", pin: "641014" }, true, TODAY)).toEqual({});
    expect(validateBirth({ ...VALID, delivery: "3", email: "arul@" }, true, TODAY).email).toBe("bc.errEmail");
    expect(validateBirth({ ...VALID, delivery: "3", email: "arul.k@example.in" }, true, TODAY)).toEqual({});
  });

  it("limits the number of copies to 1–5 whole copies", () => {
    for (const c of ["0", "6", "1.5", ""]) expect(validateBirth({ ...VALID, copies: c }, true, TODAY).copies, c).toBe("bc.errCopies");
    expect(validateBirth({ ...VALID, copies: "5" }, true, TODAY).copies).toBeUndefined();
  });
});

describe("birthFee", () => {
  it("charges per copy plus speed post", () => {
    expect(birthFee("1", "1")).toBe(50);
    expect(birthFee("3", "2")).toBe(190);
    expect(birthFee("2", "3")).toBe(100);
    expect(birthFee("9", "1")).toBe(50);
  });
});

describe("checkProof", () => {
  it("accepts PDF, JPG and PNG up to 2 MB", () => {
    expect(checkProof({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(checkProof({ type: "image/png", size: 2 * 1024 * 1024 })).toBeNull();
    expect(checkProof({ type: "text/plain", size: 10 })).toBe("bc.errProofType");
    expect(checkProof({ type: "image/jpeg", size: 2 * 1024 * 1024 + 1 })).toBe("bc.errProofSize");
  });
});
