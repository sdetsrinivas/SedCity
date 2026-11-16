import { describe, expect, it } from "vitest";
import { cvvValid, expiryValid, formatExpiry, groupCardNumber, luhnValid, maskCard, upiValid } from "./card";

describe("card helpers", () => {
  it("groups card numbers in fours", () => {
    expect(groupCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(groupCardNumber("4111-11")).toBe("4111 11");
  });
  it("checks the Luhn digit", () => {
    expect(luhnValid("4111 1111 1111 1111")).toBe(true);
    expect(luhnValid("5555555555554444")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
    expect(luhnValid("4111")).toBe(false);
  });
  it("formats and validates expiry against the current month", () => {
    const now = new Date(2026, 10, 16);
    expect(formatExpiry("1129")).toBe("11/29");
    expect(expiryValid("11/26", now)).toBe(true);
    expect(expiryValid("10/26", now)).toBe(false);
    expect(expiryValid("13/30", now)).toBe(false);
    expect(expiryValid("1130", now)).toBe(false);
  });
  it("validates CVV and UPI ids and masks cards", () => {
    expect(cvvValid("123")).toBe(true);
    expect(cvvValid("12")).toBe(false);
    expect(upiValid("meena@okaxis")).toBe(true);
    expect(upiValid("meena")).toBe(false);
    expect(maskCard("4111 1111 1111 1111")).toBe("•••• 1111");
  });
});
