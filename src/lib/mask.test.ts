import { describe, expect, it } from "vitest";
import { astheenCheckDigit, formatAstheenId, formatMobile, isValidAstheenId, isValidMobile, maskMobile, mobileDigits } from "./mask";
import users from "@/mock/data/users.json";

describe("mobile mask (TXT-02)", () => {
  it.each([
    ["", ""],
    ["9", "+91 9"],
    ["98410", "+91 98410"],
    ["984102", "+91 98410 2"],
    ["9841023456", "+91 98410 23456"],
    ["98410234567890", "+91 98410 23456"],
    ["+91 98410-23456", "+91 98410 23456"],
    ["919841023456", "+91 98410 23456"],
    ["abc98x41", "+91 9841"],
  ])("formats %j as %j", (input, out) => expect(formatMobile(input)).toBe(out));

  it("survives character-by-character typing (each keystroke re-formats the previous value)", () => {
    let v = "";
    for (const ch of "98410234567890") v = formatMobile(v + ch);
    expect(v).toBe("+91 98410 23456");
  });
  it("is idempotent", () => expect(formatMobile(formatMobile("9841023456"))).toBe("+91 98410 23456"));
  it("validates Indian mobiles", () => {
    expect(isValidMobile("+91 98410 23456")).toBe(true);
    expect(isValidMobile("+91 58410 23456")).toBe(false);
    expect(isValidMobile("+91 98410 2345")).toBe(false);
  });
  it("masks for display", () => expect(maskMobile("9841023456")).toBe("+91 98XXX XX456"));
  it("extracts digits", () => expect(mobileDigits("+91 98410 23456")).toBe("9841023456"));
});

describe("Astheen ID", () => {
  it("formats progressively", () => {
    expect(formatAstheenId("4821")).toBe("ASP-4821");
    expect(formatAstheenId("48217730")).toBe("ASP-4821-7730");
    expect(formatAstheenId("482177306")).toBe("ASP-4821-7730-6");
    expect(formatAstheenId("ASP-4821-7730-6999")).toBe("ASP-4821-7730-6");
  });
  it("validates the check digit", () => {
    expect(isValidAstheenId("ASP-4821-7730-6")).toBe(true);
    expect(isValidAstheenId("ASP-4821-7730-5")).toBe(false);
    expect(isValidAstheenId("ASP-4821-7730")).toBe(false);
    expect(astheenCheckDigit("48217730")).toBe(6);
  });
  it("all seeded users have valid Astheen IDs", () => {
    for (const u of users) expect(isValidAstheenId(u.astheenId), u.username).toBe(true);
  });
});
