import data from "../data/grievance.json";
import { call } from "../api";
import { store } from "../store";
import { listApplications, saveApplication } from "@/lib/applications";
import { addDays, todayISO } from "@/lib/format";
import { firstAvailable, isAvailable, STAGE_INSPECTION, STAGE_RESOLVED } from "@/modules/grievance/tracking";

export type Category = (typeof data.categories)[number];

export const CATEGORIES: Category[] = data.categories;
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

export interface GrievancePayload {
  category: string;
  ward: string;
  description: string;
  inspectionTime: string;
  photos: string[];
  name: string;
  mobile: string;
}

/** Registers a grievance with the ward office (GRIEVANCE_SUBMIT). */
export const submitGrievance = (payload: GrievancePayload) =>
  call("GRIEVANCE_SUBMIT", () => ({ received: true, slaDays: categoryById(payload.category)?.slaDays ?? 7 }));

// ── Tracking (/grievances/track) ────────────────────────────────────────────────

export interface GrievanceRecord {
  ref: string;
  /** Username of the citizen for seeded grievances. */
  owner?: string;
  mobile?: string;
  category: string;
  ward: string;
  description: string;
  /** ISO date-time. */
  submittedAt: string;
  /** "HH:MM", 24-hour. */
  inspectionTime: string;
  /** ISO date by which it should be resolved. */
  due: string;
  stage: number;
  history: { stage: number; at: string }[];
  /** ISO date of the site inspection (from stage 2 on). */
  inspectionDate?: string;
  rescheduled?: boolean;
  rating?: number;
  comment?: string;
}

type Progress = Pick<GrievanceRecord, "stage" | "history" | "inspectionDate" | "rescheduled" | "rating" | "comment">;
const PROGRESS_KEY = "grievanceProgress";
const readProgress = () => store.get<Record<string, Partial<Progress>>>(PROGRESS_KEY, {});
const writeProgress = (ref: string, p: Partial<Progress>) => store.set(PROGRESS_KEY, { ...readProgress(), [ref]: { ...readProgress()[ref], ...p } });

const at = (iso: string, hh = 10) => new Date(`${iso}T${String(hh).padStart(2, "0")}:00:00`).toISOString();

/** Seeded grievances: stage k was reached `step` days after stage k-1. */
function fromSeed(s: (typeof data.seeded)[number], today: string): GrievanceRecord {
  const sla = categoryById(s.category)?.slaDays ?? 7;
  const step = Math.max(1, Math.floor(sla / 3));
  const history = Array.from({ length: s.stage + 1 }, (_, k) => ({ stage: k, at: at(addDays(s.submitted, k * step), 10 + k) }));
  const inspectionDate = s.stage === STAGE_INSPECTION
    ? firstAvailable(addDays(today, 2), today) ?? addDays(today, 2)
    : s.stage > STAGE_INSPECTION ? addDays(s.submitted, STAGE_INSPECTION * step) : undefined;
  return {
    ref: s.ref, owner: s.owner, category: s.category, ward: s.ward, description: s.description, submittedAt: at(s.submitted, 9),
    inspectionTime: s.inspectionTime, due: addDays(s.submitted, sla), stage: s.stage, history, inspectionDate,
    rating: "rating" in s ? (s.rating as number) : undefined,
  };
}

function fromApplications(): GrievanceRecord[] {
  return listApplications().filter((a) => a.service === "grievance").map((a) => ({
    ref: a.ref, mobile: a.details.mobile, category: a.details.category, ward: a.details.ward, description: a.details.description,
    submittedAt: a.submittedAt, inspectionTime: a.details.inspectionTime, due: a.details.due, stage: 0,
    history: [{ stage: 0, at: a.submittedAt }],
  }));
}

/** Every grievance known to this browser (seeded + registered here), with its saved progress applied. */
export function allGrievances(today = todayISO()): GrievanceRecord[] {
  const progress = readProgress();
  return [...fromApplications(), ...data.seeded.map((s) => fromSeed(s, today))].map((g) => ({ ...g, ...progress[g.ref] }));
}

export const findGrievance = (ref: string) => allGrievances().find((g) => g.ref === ref);

/** Grievances of a signed-in citizen, newest first. */
export function myGrievances(username: string, mobile: string): GrievanceRecord[] {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return allGrievances()
    .filter((g) => g.owner === username || (!!g.mobile && g.mobile === digits))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** Track button: the grievance, or null when the number is unknown (GRIEVANCE_LOOKUP). */
export const lookupGrievance = (ref: string) => call("GRIEVANCE_LOOKUP", () => findGrievance(ref) ?? null);

/**
 * DYN-05: one automatic status check (GRIEVANCE_STATUS). The ward office moves a new grievance on by
 * one stage per check until the site inspection is scheduled; later stages are not reached here.
 */
export const checkGrievanceStatus = (ref: string) =>
  call("GRIEVANCE_STATUS", () => {
    const g = findGrievance(ref);
    if (!g) return null;
    if (g.stage >= STAGE_INSPECTION) return g;
    const today = todayISO();
    const stage = g.stage + 1;
    const next: Partial<Progress> = { stage, history: [...g.history, { stage, at: new Date().toISOString() }] };
    if (stage === STAGE_INSPECTION) next.inspectionDate = firstAvailable(addDays(today, 2), today) ?? addDays(today, 2);
    writeProgress(ref, next);
    const app = listApplications().find((a) => a.ref === ref);
    if (app && app.status === "Submitted") saveApplication({ ...app, status: "Under review" });
    return { ...g, ...next };
  });

/** DAT-06: move the site inspection to another available date (GRIEVANCE_UPDATE). */
export const rescheduleInspection = (ref: string, date: string) =>
  call("GRIEVANCE_UPDATE", () => {
    writeProgress(ref, { inspectionDate: date, rescheduled: true });
    return findGrievance(ref)!;
  }, { failWhen: () => !isAvailable(date, todayISO()) || findGrievance(ref)?.stage !== STAGE_INSPECTION, failStatus: 422 });

/** OTH-09: rate a resolved grievance (GRIEVANCE_UPDATE). */
export const rateResolution = (ref: string, rating: number, comment: string) =>
  call("GRIEVANCE_UPDATE", () => {
    writeProgress(ref, { rating, comment });
    return findGrievance(ref)!;
  }, { failWhen: () => findGrievance(ref)?.stage !== STAGE_RESOLVED || rating < 1 || rating > 5, failStatus: 422 });
