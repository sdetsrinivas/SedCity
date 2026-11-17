import type { DictKey } from "@/i18n";
import { formatDate } from "@/lib/format";
import { BIRTH_FEES } from "@/mock/endpoints/certificates";

/** TXT-10: the child's name is limited by the input's maxlength (and checked again here). */
export const NAME_MAX = 40;
/** Earliest date of birth the online service accepts (older records are issued at the counter). */
export const DOB_MIN = "1950-01-01";
export const COPIES_MIN = 1;
export const COPIES_MAX = 5;
export const MAX_PROOF_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];
/** Hospital list value for a birth at home or anywhere else. */
export const OTHER_PLACE = "OTHER";

/** RAD-04: both radio groups use name="type" with values 1–3, each in its own <form>. */
export const APPLICANT_TYPES = [
  { v: "1", label: "bc.applicantParent" },
  { v: "2", label: "bc.applicantGuardian" },
  { v: "3", label: "bc.applicantSelf" },
] as const satisfies readonly { v: string; label: DictKey }[];

export const DELIVERY_MODES = [
  { v: "1", label: "bc.deliveryCollect", hint: "bc.deliveryCollectHint" },
  { v: "2", label: "bc.deliveryPost", hint: "bc.deliveryPostHint" },
  { v: "3", label: "bc.deliveryEmail", hint: "bc.deliveryEmailHint" },
] as const satisfies readonly { v: string; label: DictKey; hint: DictKey }[];

export interface BirthDraft {
  childName: string;
  sex: string;
  dob: string;
  hospital: string;
  place: string;
  motherName: string;
  fatherName: string;
  applicantType: string;
  applicantName: string;
  mobile: string;
  delivery: string;
  address: string;
  pin: string;
  email: string;
  copies: string;
}

export const EMPTY_BIRTH: BirthDraft = {
  childName: "", sex: "", dob: "", hospital: "", place: "", motherName: "", fatherName: "",
  applicantType: "", applicantName: "", mobile: "", delivery: "", address: "", pin: "", email: "", copies: "1",
};

export type BirthField = keyof BirthDraft | "proof";
export type BirthErrors = Partial<Record<BirthField, DictKey>>;

/** Variables used by the error messages; pass them wherever an error key is rendered. */
export const ERROR_VARS = { max: NAME_MAX, date: formatDate(DOB_MIN), min: COPIES_MIN, copies: COPIES_MAX } as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Field errors for the whole application. `today` is the local ISO date. */
export function validateBirth(d: BirthDraft, hasProof: boolean, today: string): BirthErrors {
  const e: BirthErrors = {};
  const name = d.childName.trim();
  if (name.length < 2) e.childName = "bc.errChildName";
  else if (name.length > NAME_MAX) e.childName = "bc.errChildNameLong";
  if (!d.sex) e.sex = "bc.errSex";
  if (!ISO.test(d.dob)) e.dob = "bc.errDob";
  else if (d.dob > today) e.dob = "bc.errDobFuture";
  else if (d.dob < DOB_MIN) e.dob = "bc.errDobOld";
  if (!d.hospital) e.hospital = "bc.errHospital";
  else if (d.hospital === OTHER_PLACE && d.place.trim().length < 5) e.place = "bc.errPlace";
  if (d.motherName.trim().length < 2) e.motherName = "bc.errMother";
  if (!d.applicantType) e.applicantType = "bc.errApplicantType";
  if (d.applicantName.trim().length < 3) e.applicantName = "bc.errApplicantName";
  if (!/^[6-9]\d{9}$/.test(d.mobile)) e.mobile = "bc.errMobile";
  if (!hasProof) e.proof = "bc.errProof";
  if (!d.delivery) e.delivery = "bc.errDelivery";
  if (d.delivery === "2") {
    if (d.address.trim().length < 10) e.address = "bc.errAddress";
    if (!/^6\d{5}$/.test(d.pin)) e.pin = "bc.errPin";
  }
  if (d.delivery === "3" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "bc.errEmail";
  const copies = Number(d.copies);
  if (!Number.isInteger(copies) || copies < COPIES_MIN || copies > COPIES_MAX) e.copies = "bc.errCopies";
  return e;
}

/** Fee in rupees: per copy, plus speed post when posted. Invalid copy counts count as one. */
export function birthFee(copies: string, delivery: string): number {
  const n = Number(copies);
  const count = Number.isInteger(n) && n >= COPIES_MIN && n <= COPIES_MAX ? n : 1;
  return count * BIRTH_FEES.perCopy + (delivery === "2" ? BIRTH_FEES.speedPost : 0);
}

/** FIL-01: error key for a chosen proof file, or null when it can be attached. */
export function checkProof(f: { type: string; size: number }): DictKey | null {
  if (!PROOF_TYPES.includes(f.type)) return "bc.errProofType";
  if (f.size > MAX_PROOF_BYTES) return "bc.errProofSize";
  return null;
}
