"use client";
import { store } from "@/mock/store";

export type Role = "citizen" | "officer";

export interface Session {
  username: string;
  name: string;
  nameTa: string;
  role: Role;
  astheenId: string;
  mobile: string;
  email: string;
  ward: string;
  loginAt: string;
  keepSignedIn: boolean;
}

export const SESSION_EVENT = "amc:session";

export function getSession(): Session | null {
  return store.get<Session | null>("session", null, "local") ?? store.get<Session | null>("session", null, "session");
}

/** "Keep me signed in" (CHK-01) decides whether the session survives the browser being closed. */
export function setSession(s: Session): void {
  store.remove("session", "local");
  store.remove("session", "session");
  store.set("session", s, s.keepSignedIn ? "local" : "session");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  store.remove("session", "local");
  store.remove("session", "session");
  window.dispatchEvent(new Event(SESSION_EVENT));
}
