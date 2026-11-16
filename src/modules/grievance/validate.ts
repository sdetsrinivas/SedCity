import type { DictKey } from "@/i18n";
import { isSlotAllowed, parseValue } from "./time";

export const DESC_MIN = 30;
export const DESC_MAX = 1000;
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"];

export interface GrievanceDraft {
  category: string;
  ward: string;
  description: string;
  time: string;
  name: string;
  mobile: string;
}

export const EMPTY_DRAFT: GrievanceDraft = { category: "", ward: "", description: "", time: "", name: "", mobile: "" };

export type FieldKey = "category" | "description" | "time" | "name" | "mobile";
export type Errors = Partial<Record<FieldKey, DictKey>>;

/** Field errors shown inline. The ward is not here: a missing ward is reported by an alert on submit. */
export function validateGrievance(d: GrievanceDraft): Errors {
  const e: Errors = {};
  if (!d.category) e.category = "gr.errCategory";
  const len = d.description.trim().length;
  if (len < DESC_MIN) e.description = "gr.errDescShort";
  else if (len > DESC_MAX) e.description = "gr.errDescLong";
  const t = parseValue(d.time);
  if (!t || !isSlotAllowed(t.h, t.m)) e.time = "gr.errTime";
  if (d.name.trim().length < 3) e.name = "gr.errName";
  if (!/^[6-9]\d{9}$/.test(d.mobile)) e.mobile = "gr.errMobile";
  return e;
}

/** Returns an error key for a dropped file, or null if it can be attached. */
export function checkPhoto(f: { type: string; size: number }): DictKey | null {
  if (!PHOTO_TYPES.includes(f.type)) return "gr.errPhotoType";
  if (f.size > MAX_PHOTO_BYTES) return "gr.errPhotoSize";
  return null;
}
