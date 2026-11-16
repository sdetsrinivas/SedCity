import type { DictKey } from "@/i18n";
import type { Draft, ErrorKey } from "./types";

/** Everything that must be in order before the tax can be paid; empty when the form is complete. */
export function validateDraft(d: Draft): Partial<Record<ErrorKey, DictKey>> {
  const errors: Partial<Record<ErrorKey, DictKey>> = {};
  if (d.check === "checking") errors.assessment = "pt.errChecking";
  else if (d.check === "paid") errors.assessment = "pt.errPaid";
  else if (d.check !== "found" || !d.record) errors.assessment = "pt.errAssessment";
  if (!d.localityId) errors.locality = "pt.errLocality";
  if (!d.usage) errors.usage = "pt.errUsage";
  if (!d.floors.length || d.floors.some((f) => !f.area)) errors.floors = "pt.errFloors";
  if (!d.method) errors.method = "pt.errMethod";
  return errors;
}
