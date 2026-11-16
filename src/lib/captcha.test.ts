import { describe, expect, it } from "vitest";
import { answerOf, decodeToken, encodeToken, newChallenge, verifyCaptcha } from "./captcha";

describe("math captcha (OTH-14)", () => {
  it("never produces negative subtraction results", () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 500; i++) {
      const c = newChallenge(rng);
      expect(answerOf(c)).toBeGreaterThanOrEqual(0);
    }
  });
  it("round-trips the token (documented bypass)", () => {
    const c = { a: 7, b: 5, op: "+" as const, ts: 1 };
    expect(decodeToken(encodeToken(c))).toEqual(c);
    expect(JSON.parse(Buffer.from(encodeToken(c), "base64").toString())).toEqual(c);
  });
  it("verifies answers", () => {
    const t = encodeToken({ a: 6, b: 4, op: "×", ts: 1 });
    expect(verifyCaptcha(t, "24")).toBe(true);
    expect(verifyCaptcha(t, " 24 ")).toBe(true);
    expect(verifyCaptcha(t, "25")).toBe(false);
    expect(verifyCaptcha(t, "")).toBe(false);
    expect(verifyCaptcha("garbage", "24")).toBe(false);
    expect(verifyCaptcha(encodeToken({ a: 9, b: 3, op: "-", ts: 1 }), "6")).toBe(true);
  });
});
