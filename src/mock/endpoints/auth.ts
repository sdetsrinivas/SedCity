import users from "../data/users.json";
import { call, ApiError } from "../api";
import { store } from "../store";
import type { Role } from "@/lib/session";

export interface UserRecord {
  username: string;
  password: string;
  role: Role;
  name: string;
  nameTa: string;
  astheenId: string;
  mobile: string;
  email: string;
  ward: string;
  designation?: string;
}

const seeded = users as UserRecord[];
const registered = () => store.get<UserRecord[]>("users", []);
export const allUsers = () => [...seeded, ...registered()];
const find = (u: string) => allUsers().find((x) => x.username.toLowerCase() === u.trim().toLowerCase());

export type LoginFailure = "invalid" | "role";

export function checkCredentials(username: string, password: string, role: Role) {
  return call("LOGIN_CHECK", () => {
    const user = find(username);
    if (!user || user.password !== password) return { ok: false as const, reason: "invalid" as LoginFailure };
    if (user.role !== role) return { ok: false as const, reason: "role" as LoginFailure };
    const { password: _pw, ...safe } = user;
    return { ok: true as const, user: safe };
  });
}

interface PendingOtp {
  otp: string;
  username: string;
  expires: number;
}

export function sendOtp(username: string, rng: () => number = Math.random) {
  return call("OTP_SEND", () => {
    const user = find(username);
    if (!user) throw new ApiError("OTP_SEND", "Unknown user", 404);
    const otp = String(100000 + Math.floor(rng() * 900000));
    store.set("otp", { otp, username: user.username, expires: Date.now() + 5 * 60_000 } satisfies PendingOtp, "session");
    return { otp, mobile: user.mobile };
  });
}

export function verifyOtp(username: string, otp: string) {
  return call("OTP_VERIFY", () => {
    const pending = store.get<PendingOtp | null>("otp", null, "session");
    const ok = !!pending && pending.username === username && pending.otp === otp.trim() && pending.expires > Date.now();
    if (ok) store.remove("otp", "session");
    return ok;
  });
}

export function registerUser(rec: UserRecord) {
  return call("REGISTER_SUBMIT", () => {
    if (find(rec.username)) return { ok: false as const, reason: "taken" };
    store.set("users", [...registered(), rec]);
    return { ok: true as const };
  });
}

export const isUsernameTaken = (u: string) => !!find(u);
