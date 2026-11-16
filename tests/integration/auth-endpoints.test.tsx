import { describe, expect, it } from "vitest";
import { checkCredentials, registerUser, sendOtp, verifyOtp } from "@/mock/endpoints/auth";

describe("auth endpoints + store", () => {
  it("accepts seeded credentials and strips the password", async () => {
    const res = await checkCredentials("Meena.R", "Astheen@123", "citizen");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.name).toBe("Meena Rajendran");
      expect(res.user).not.toHaveProperty("password");
    }
  });

  it("rejects wrong passwords and wrong roles distinctly", async () => {
    expect(await checkCredentials("meena.r", "nope", "citizen")).toEqual({ ok: false, reason: "invalid" });
    expect(await checkCredentials("meena.r", "Astheen@123", "officer")).toEqual({ ok: false, reason: "role" });
    expect((await checkCredentials("officer.selvi", "Officer@123", "officer")).ok).toBe(true);
  });

  it("OTP is single-use and bound to the user", async () => {
    const { otp, mobile } = await sendOtp("arul.k", () => 0.5);
    expect(otp).toMatch(/^\d{6}$/);
    expect(mobile).toBe("9790011223");
    expect(await verifyOtp("meena.r", otp)).toBe(false);
    expect(await verifyOtp("arul.k", "000000")).toBe(false);
    expect(await verifyOtp("arul.k", otp)).toBe(true);
    expect(await verifyOtp("arul.k", otp)).toBe(false);
  });

  it("registered users persist in localStorage and can sign in; duplicates are refused", async () => {
    const rec = { username: "kavya.s", password: "Kavya@2026", role: "citizen" as const, name: "Kavya", nameTa: "Kavya", astheenId: "ASP-4821-7730-6", mobile: "9876543210", email: "", ward: "—" };
    expect(await registerUser(rec)).toEqual({ ok: true });
    expect(await registerUser(rec)).toEqual({ ok: false, reason: "taken" });
    expect(await registerUser({ ...rec, username: "meena.r" })).toEqual({ ok: false, reason: "taken" });
    expect((await checkCredentials("kavya.s", "Kavya@2026", "citizen")).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem("amc.users")!)).toHaveLength(1);
  });
});
