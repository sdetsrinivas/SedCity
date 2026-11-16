import tariffs from "../data/tariffs.json";
import { call } from "../api";

export type ConnType = "domestic" | "commercial" | "industrial";
export type Phase = "single" | "three";
export const TARIFFS = tariffs;

export interface Estimate {
  deposit: number;
  serviceCharge: number;
  applicationFee: number;
  total: number;
}

export function computeEstimate(type: ConnType, phase: Phase, loadKw: number): Estimate {
  const deposit = tariffs.depositPerKw[type] * Math.ceil(loadKw);
  const serviceCharge = tariffs.serviceCharge[phase];
  const applicationFee = tariffs.applicationFee;
  return { deposit, serviceCharge, applicationFee, total: deposit + serviceCharge + applicationFee };
}

/** Returns an error key (see i18n "el.*") or null. */
export function validateLoad(type: ConnType | "", phase: Phase | "", raw: string): string | null {
  const kw = Number(raw);
  if (!raw.trim() || !Number.isFinite(kw) || kw < 1 || kw > tariffs.limits.maxKw) return "el.errLoad";
  if (phase === "single" && kw > tariffs.limits.singlePhaseMaxKw) return "el.errSinglePhase";
  if (type === "domestic" && kw > tariffs.limits.domesticMaxKw) return "el.errDomesticLoad";
  return null;
}

export const fetchEstimate = (type: ConnType, phase: Phase, loadKw: number) =>
  call("REVIEW_BANNER", () => computeEstimate(type, phase, loadKw));

export const submitElectricity = <T,>(payload: T) => call("ELEC_SUBMIT", () => ({ received: true, payload }));
