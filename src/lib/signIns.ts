"use client";
import { store } from "@/mock/store";

/** Sign-in times per username on this device (newest first, at most 10), for "Last sign-in" on the dashboard. */
type History = Record<string, string[]>;

export function recordSignIn(username: string, at: string): void {
  const all = store.get<History>("signIns", {});
  store.set("signIns", { ...all, [username]: [at, ...(all[username] ?? []).filter((x) => x !== at)].slice(0, 10) });
}

/** The latest sign-in on this device before `current`, or null when this is the first one here. */
export function previousSignIn(username: string, current: string): string | null {
  const list = store.get<History>("signIns", {})[username] ?? [];
  return list.filter((x) => x < current).sort().at(-1) ?? null;
}
