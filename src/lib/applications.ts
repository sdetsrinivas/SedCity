"use client";
import { store } from "@/mock/store";

/** Applications submitted from any service; shown later on the citizen dashboard. */
export type ServiceKind = "electricity" | "water" | "property-tax" | "grievance" | "birth" | "trade" | "booking";

export interface Application {
  ref: string;
  service: ServiceKind;
  title: string;
  submittedAt: string;
  status: "Submitted" | "Under review" | "Approved" | "Rejected" | "Paid" | "Resolved";
  applicant?: string;
  amount?: number;
  details: Record<string, string>;
}

export const SERVICE_CODE: Record<ServiceKind, string> = {
  electricity: "EL", water: "WT", "property-tax": "PT", grievance: "GR", birth: "BC", trade: "TL", booking: "BK",
};

export function listApplications(): Application[] {
  return store.get<Application[]>("applications", []);
}

/** Reference numbers look like AMC/EL/2026/004817 — a per-service counter kept in localStorage. */
export function nextReference(service: ServiceKind, now = new Date()): string {
  const counters = store.get<Record<string, number>>("refCounters", {});
  const code = SERVICE_CODE[service];
  const next = (counters[code] ?? 4800 + Math.floor(Math.random() * 100)) + 1;
  store.set("refCounters", { ...counters, [code]: next });
  return `AMC/${code}/${now.getFullYear()}/${String(next).padStart(6, "0")}`;
}

export function saveApplication(app: Application): void {
  store.set("applications", [app, ...listApplications().filter((a) => a.ref !== app.ref)]);
}

export const findApplication = (ref: string) => listApplications().find((a) => a.ref === ref.trim().toUpperCase());
