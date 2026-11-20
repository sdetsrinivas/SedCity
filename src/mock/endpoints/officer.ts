import { call } from "../api";
import { store } from "../store";
import {
  INCOMING_COUNT, applyClaims, arrivedItem, hourStart, seededHistory, seededItems, sortBySla, sortHistory, wardsOfZone, zoneOf,
  type Claims, type HistoryEntry, type QueueItem,
} from "@/modules/officer/queue";

/**
 * The officer work queue's mock service.
 * - The anchor (start of the hour the queue was first opened in this browser session) and the grievances
 *   that arrived since are kept in sessionStorage (`amc.queueAnchor`, `amc.queueArrivals`), so a reload
 *   shows the same queue.
 * - Claims and releases are kept in localStorage `amc.queueClaims` (ref → { by, at }), their history
 *   entries in `amc.queueEvents`; the chosen wards per officer in `amc.queueWards`.
 */

interface Arrival { index: number; at: number }

function anchor(): number {
  const saved = store.get<number | null>("queueAnchor", null, "session");
  if (typeof saved === "number") return saved;
  const a = hourStart(Date.now());
  store.set("queueAnchor", a, "session");
  return a;
}

const claims = () => store.get<Claims>("queueClaims", {});
const events = () => store.get<Record<string, HistoryEntry[]>>("queueEvents", {});

function addEvent(ref: string, e: HistoryEntry) {
  const all = events();
  store.set("queueEvents", { ...all, [ref]: [...(all[ref] ?? []), e] });
}

function currentItems(username: string): QueueItem[] {
  const a = anchor();
  const arrivals = store.get<Arrival[]>("queueArrivals", [], "session");
  const wards = new Set(wardsOfZone(zoneOf(username)).map((w) => w.id));
  const items = [...seededItems(a), ...arrivals.map((x) => arrivedItem(x.index, x.at))];
  return sortBySla(applyClaims(items, claims())).filter((it) => wards.has(it.ward));
}

/**
 * The open grievances of the officer's zone in SLA order (QUEUE_LOAD). On an automatic refresh the next
 * waiting grievance (if any) arrives, received now.
 */
export const fetchQueue = (username: string, refresh = false) =>
  call("QUEUE_LOAD", (): QueueItem[] => {
    anchor();
    if (refresh) {
      const arrivals = store.get<Arrival[]>("queueArrivals", [], "session");
      if (arrivals.length < INCOMING_COUNT) store.set("queueArrivals", [...arrivals, { index: arrivals.length, at: Date.now() }], "session");
    }
    return currentItems(username);
  });

/** A row's details: the grievance and its history, oldest first (QUEUE_DETAIL). */
export const fetchDetail = (username: string, ref: string) =>
  call("QUEUE_DETAIL", () => {
    const item = currentItems(username).find((it) => it.ref === ref);
    if (!item) return null;
    return { item, history: sortHistory([...seededHistory(item), ...(events()[ref] ?? [])]) };
  });

export type ClaimOutcome =
  | { outcome: "claimed" | "released"; item: QueueItem }
  | { outcome: "mine" | "notMine"; item: QueueItem }
  | { outcome: "taken"; item: QueueItem; by: string };

/** Claims a grievance for the officer (QUEUE_CLAIM); fails softly when someone else has it. */
export const claimGrievance = (username: string, ref: string) =>
  call("QUEUE_CLAIM", (): ClaimOutcome | null => {
    const item = currentItems(username).find((it) => it.ref === ref);
    if (!item) return null;
    if (item.claimedBy === username) return { outcome: "mine", item };
    if (item.claimedBy) return { outcome: "taken", item, by: item.claimedBy };
    const at = new Date().toISOString();
    store.set("queueClaims", { ...claims(), [ref]: { by: username, at } });
    addEvent(ref, { kind: "claimed", at, by: username });
    return { outcome: "claimed", item: { ...item, claimedBy: username, claimedAt: at } };
  });

/** Gives a claimed grievance back to the open queue (QUEUE_CLAIM); only the officer's own claims. */
export const releaseGrievance = (username: string, ref: string) =>
  call("QUEUE_CLAIM", (): ClaimOutcome | null => {
    const item = currentItems(username).find((it) => it.ref === ref);
    if (!item) return null;
    if (item.claimedBy !== username) return { outcome: "notMine", item };
    const at = new Date().toISOString();
    store.set("queueClaims", { ...claims(), [ref]: { by: null, at } });
    addEvent(ref, { kind: "released", at, by: username });
    return { outcome: "released", item: { ...item, claimedBy: null, claimedAt: null } };
  });

type PerUser<T> = Record<string, T>;
export const loadWards = (username: string): string[] => store.get<PerUser<string[]>>("queueWards", {})[username] ?? [];
export const saveWards = (username: string, wards: string[]) => store.set("queueWards", { ...store.get<PerUser<string[]>>("queueWards", {}), [username]: wards });
