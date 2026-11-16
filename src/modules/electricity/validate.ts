import { isValidAstheenId, isValidMobile } from "@/lib/mask";
import { validateLoad } from "@/mock/endpoints/electricity";
import type { Draft, Errors } from "./types";

export const STEP_COUNT = 5;

/** Pure per-step validation; values are i18n keys. */
export function validateStep(step: number, d: Draft, range: { min: string; max: string }, declared = false): Errors {
  const e: Errors = {};
  if (step === 1) {
    if (!d.connType) e.connType = "el.errType";
    if (!d.phase) e.phase = "el.errPhase";
    const load = validateLoad(d.connType, d.phase, d.load);
    if (load) e.load = load;
  }
  if (step === 2) {
    if (d.name.trim().length < 3) e.name = "reg.errName";
    if (!isValidAstheenId(d.astheenId)) e.astheenId = "reg.errAstheen";
    if (!isValidMobile(d.mobile)) e.mobile = "reg.errMobile";
  }
  if (step === 3) {
    if (!d.zoneId || !d.wardId || !d.streetId) e.zoneId = "el.errAddress";
    if (!d.door.trim()) e.door = "el.errDoor";
  }
  if (step === 4) {
    if (!d.inspectionDate || d.inspectionDate < range.min || d.inspectionDate > range.max) e.inspectionDate = "el.errDate";
    if (!d.idProof) e.idProof = "el.errFile";
    if (!d.ownershipProof) e.ownershipProof = "el.errFile";
  }
  if (step === 5 && !declared) e.declare = "el.errDeclare";
  return e;
}
