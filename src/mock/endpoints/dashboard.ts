import { call } from "../api";
import { store } from "../store";
import { listApplications, type Application } from "@/lib/applications";
import { todayISO } from "@/lib/format";
import type { Session } from "@/lib/session";
import {
  browserPayments, dashboardApplications, normaliseOrder, seededDocs, seededNotices, seededPayments, sortPayments,
  type Doc, type Notice, type Payment, type WidgetId,
} from "@/modules/dashboard/data";

/**
 * The citizen dashboard's mock service. Per-citizen choices made on the dashboard (read / deleted
 * notifications, document names, card order, preferences, contact email) are kept in localStorage,
 * keyed by username.
 */

type PerUser<T> = Record<string, T>;
const readUser = <T,>(key: string, username: string, fallback: T): T => store.get<PerUser<T>>(key, {})[username] ?? fallback;
const writeUser = <T,>(key: string, username: string, value: T) => store.set(key, { ...store.get<PerUser<T>>(key, {}), [username]: value });

interface NoticeState { read: string[]; deleted: string[] }
const noticeState = (u: string) => readUser<NoticeState>("dashNotices", u, { read: [], deleted: [] });

export interface DashboardData {
  notices: Notice[];
  docs: Doc[];
  payments: Payment[];
  applications: Application[];
}

/** Everything the dashboard cards show, after the SKELETON delay. */
export const fetchDashboard = (session: Session) =>
  call("SKELETON", (): DashboardData => {
    const today = todayISO();
    const stored = listApplications();
    const ns = noticeState(session.username);
    const names = readUser<Record<string, string>>("docNames", session.username, {});
    return {
      notices: seededNotices(session.username, today)
        .filter((n) => !ns.deleted.includes(n.id))
        .map((n) => (ns.read.includes(n.id) ? { ...n, unread: false } : n)),
      docs: seededDocs(session.username, today).map((d) => (names[d.id] ? { ...d, name: { en: names[d.id], ta: names[d.id] } } : d)),
      payments: sortPayments([...seededPayments(session.username, today), ...browserPayments(stored)]),
      applications: dashboardApplications(stored, session.mobile, today),
    };
  });

export function markNoticesRead(username: string, ids: string[]) {
  const s = noticeState(username);
  writeUser("dashNotices", username, { ...s, read: [...new Set([...s.read, ...ids])] });
}

/** Called when the Undo window closes: the deletion becomes permanent. */
export function deleteNotices(username: string, ids: string[]) {
  const s = noticeState(username);
  writeUser("dashNotices", username, { ...s, deleted: [...new Set([...s.deleted, ...ids])] });
}

export function renameDoc(username: string, id: string, name: string) {
  writeUser("docNames", username, { ...readUser<Record<string, string>>("docNames", username, {}), [id]: name });
}

export const loadOrder = (username: string): WidgetId[] => normaliseOrder(readUser<unknown>("dashLayout", username, null));
export const saveOrder = (username: string, order: WidgetId[]) => writeUser("dashLayout", username, order);

export interface Prefs { paperless: boolean }
export const loadPrefs = (username: string): Prefs => readUser<Prefs>("prefs", username, { paperless: false });
export const savePrefs = (username: string, p: Prefs) => writeUser("prefs", username, p);

export const contactEmail = (s: Session) => readUser<string | null>("contactEmail", s.username, null) ?? s.email;

/** Saves a new contact email (PROFILE_SAVE). */
export const saveEmail = (username: string, email: string) =>
  call("PROFILE_SAVE", () => {
    writeUser("contactEmail", username, email.trim());
    return { ok: true as const };
  });
