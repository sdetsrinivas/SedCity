import data from "@/mock/data/officer.json";
import grievance from "@/mock/data/grievance.json";
import geo from "@/mock/data/geo.json";

/**
 * Pure rules of the officer work queue (module 11 part B): the seeded open grievances of the zone,
 * placed relative to an anchor time (start of the hour the officer first opened the queue in this
 * browser session), the grievances that arrive while the queue is open, SLA due times and the SLA
 * order. Shared by the page, the mock endpoint, the unit tests and the verification checks.
 */

export type Bi = { en: string; ta: string };
export const HOUR = 3_600_000;

export type HistoryKind = "received" | "assigned" | "photo" | "reminder" | "escalated" | "claimed" | "released";
export interface HistoryEntry { kind: HistoryKind; at: string; by?: string }

export interface QueueItem {
  ref: string;
  category: string;
  ward: string;
  street: string;
  citizen: Bi;
  mobile: string;
  description: string;
  /** ISO date-time the citizen registered it. */
  received: string;
  /** ISO date-time the service time (SLA) runs out. */
  due: string;
  /** Officer id or username of whoever claimed it (null = open). */
  claimedBy: string | null;
  claimedAt: string | null;
}

/** A claim saved in this browser: `by: null` means released. */
export interface ClaimRecord { by: string | null; at: string }
export type Claims = Record<string, ClaimRecord>;

type Seed = (typeof data.queue)[number];
type Incoming = (typeof data.incoming)[number];

export const INCOMING_COUNT = data.incoming.length;
export const COLLEAGUES = data.colleagues;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export const slaDays = (category: string) => grievance.categories.find((c) => c.id === category)?.slaDays ?? 7;
export const categoryById = (id: string) => grievance.categories.find((c) => c.id === id);
export const streetName = (id: string) => geo.streets.find((s) => s.id === id)?.name ?? "";

/** Start of the hour `ms` falls in (local time). */
export function hourStart(ms: number): number {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

export const refOf = (no: number, receivedMs: number) => `AMC/GR/${new Date(receivedMs).getFullYear()}/${pad(no, 6)}`;

/** The wards of the officer's zone (empty for anyone who is not a queue officer). */
export function zoneOf(username: string): string | null {
  return (data.officers as Record<string, { zone: string }>)[username]?.zone ?? null;
}
export const wardsOfZone = (zone: string | null) => geo.wards.filter((w) => w.zoneId === zone);
export const zoneById = (id: string | null) => geo.zones.find((z) => z.id === id);

function toItem(s: Seed | Incoming, receivedMs: number, claimedBy: string | null, claimedAt: number | null): QueueItem {
  return {
    ref: refOf(s.no, receivedMs),
    category: s.category,
    ward: s.ward,
    street: s.street,
    citizen: s.citizen,
    mobile: s.mobile,
    description: s.description,
    received: new Date(receivedMs).toISOString(),
    due: new Date(receivedMs + slaDays(s.category) * 24 * HOUR).toISOString(),
    claimedBy,
    claimedAt: claimedAt === null ? null : new Date(claimedAt).toISOString(),
  };
}

/** The open grievances already in the queue, received `ageHours` before the anchor. */
export function seededItems(anchorMs: number): QueueItem[] {
  return data.queue.map((s) => {
    const claimed = "claimedBy" in s && s.claimedBy ? s.claimedBy : null;
    const at = claimed && "claimedHoursAgo" in s ? anchorMs - (s.claimedHoursAgo ?? 0) * HOUR : null;
    return toItem(s, anchorMs - s.ageHours * HOUR, claimed, at);
  });
}

/** The `index`-th grievance that arrives while the queue is open, received at `atMs`. */
export const arrivedItem = (index: number, atMs: number): QueueItem => toItem(data.incoming[index], atMs, null, null);

/** Applies the claims and releases made in this browser. */
export const applyClaims = (items: QueueItem[], claims: Claims): QueueItem[] =>
  items.map((it) => (claims[it.ref] ? { ...it, claimedBy: claims[it.ref].by, claimedAt: claims[it.ref].by ? claims[it.ref].at : null } : it));

/** SLA order: the soonest due first (overdue ones on top), ties by number. */
export const sortBySla = (items: QueueItem[]): QueueItem[] =>
  [...items].sort((a, b) => Date.parse(a.due) - Date.parse(b.due) || a.ref.localeCompare(b.ref));

/** History shown in a row's details, oldest first. */
export function seededHistory(item: QueueItem): HistoryEntry[] {
  const no = Number(item.ref.slice(-6));
  const received = Date.parse(item.received);
  const out: HistoryEntry[] = [
    { kind: "received", at: item.received },
    { kind: "assigned", at: new Date(received + 15 * 60_000).toISOString() },
  ];
  // Seeded items have more history, given in hours before the anchor (received + ageHours);
  // grievances that arrived while the queue was open have none yet.
  const seed: Seed | undefined = data.queue.find((s) => s.no === no);
  if (!seed) return out;
  const anchor = received + seed.ageHours * HOUR;
  for (const h of seed.history) out.push({ kind: h.kind as HistoryKind, at: new Date(anchor - h.hoursAgo * HOUR).toISOString() });
  if ("claimedBy" in seed && seed.claimedBy && "claimedHoursAgo" in seed) {
    out.push({ kind: "claimed", at: new Date(anchor - (seed.claimedHoursAgo ?? 0) * HOUR).toISOString(), by: seed.claimedBy });
  }
  return out;
}

export const sortHistory = (h: HistoryEntry[]) => [...h].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

/** Time left until `due` as display parts: days and hh:mm:ss (of the absolute value), and whether it is overdue. */
export function splitLeft(dueMs: number, nowMs: number): { overdue: boolean; days: number; time: string } {
  const ms = dueMs - nowMs;
  const total = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { overdue: ms < 0, days, time: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

/** Less than a day left (and not yet overdue). */
export const dueSoon = (dueMs: number, nowMs: number) => dueMs > nowMs && dueMs - nowMs < 24 * HOUR;

/** Short ward label for a chip: "Ward 14 – Kalaivani Nagar" → "Ward 14". */
export const wardShort = (name: string) => name.split(" – ")[0];
