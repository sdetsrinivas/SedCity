import type { DictKey } from "@/i18n";
import { tradeCategoryById } from "@/mock/endpoints/certificates";

export const BUSINESS_NAME_MAX = 80;
export const AREA_MIN = 20;
export const AREA_MAX = 20000;
export const DOCS_MIN = 2;
export const DOCS_MAX = 5;
export const MAX_DOC_BYTES = 2 * 1024 * 1024;
export const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
/** OTH-05: the strokes drawn on the signature pad must add up to at least this many CSS pixels. */
export const SIGNATURE_MIN_LENGTH = 60;

export const OWNERSHIP = [
  { v: "owned", label: "tl.owned" },
  { v: "rented", label: "tl.rented" },
  { v: "leased", label: "tl.leased" },
] as const satisfies readonly { v: string; label: DictKey }[];

export interface Address {
  line: string;
  pin: string;
}

export interface TradeDraft {
  businessName: string;
  category: string;
  area: string;
  premises: Address;
  ward: string;
  ownership: string;
  ownerName: string;
  mobile: string;
  email: string;
  residence: Address;
  holder: string;
  account: string;
  account2: string;
  ifsc: string;
  declared: boolean;
}

export const EMPTY_ADDRESS: Address = { line: "", pin: "" };

export const EMPTY_TRADE: TradeDraft = {
  businessName: "", category: "", area: "", premises: EMPTY_ADDRESS, ward: "", ownership: "",
  ownerName: "", mobile: "", email: "", residence: EMPTY_ADDRESS,
  holder: "", account: "", account2: "", ifsc: "", declared: false,
};

export type TradeField =
  | "businessName" | "category" | "area" | "premisesLine" | "premisesPin" | "ward" | "ownership"
  | "ownerName" | "mobile" | "email" | "residenceLine" | "residencePin"
  | "documents" | "holder" | "account" | "account2" | "ifsc" | "signature" | "declared";
export type TradeErrors = Partial<Record<TradeField, DictKey>>;

/** Variables used by the error messages; pass them wherever an error key is rendered. */
export const ERROR_VARS = { max: BUSINESS_NAME_MAX, min: AREA_MIN, area: AREA_MAX, docs: DOCS_MIN, most: DOCS_MAX } as const;

/** What the page knows about the attachments and the signature when it validates. */
export interface TradeExtras {
  documents: number;
  /** Total length of the signature strokes in CSS pixels (0 when the pad is empty). */
  signature: number;
}

const PIN = /^6\d{5}$/;

/** Field errors for the whole application, in the order they appear on the page. */
export function validateTrade(d: TradeDraft, x: TradeExtras): TradeErrors {
  const e: TradeErrors = {};
  const name = d.businessName.trim();
  if (name.length < 3) e.businessName = "tl.errBusinessName";
  else if (name.length > BUSINESS_NAME_MAX) e.businessName = "tl.errBusinessNameLong";
  if (!tradeCategoryById(d.category)) e.category = "tl.errCategory";
  const area = Number(d.area);
  if (!d.area.trim() || !Number.isInteger(area) || area < AREA_MIN || area > AREA_MAX) e.area = "tl.errArea";
  if (d.premises.line.trim().length < 10) e.premisesLine = "tl.errPremisesLine";
  if (!PIN.test(d.premises.pin)) e.premisesPin = "tl.errPremisesPin";
  if (!d.ward) e.ward = "tl.errWard";
  if (!d.ownership) e.ownership = "tl.errOwnership";
  if (d.ownerName.trim().length < 3) e.ownerName = "tl.errOwnerName";
  if (!/^[6-9]\d{9}$/.test(d.mobile)) e.mobile = "tl.errMobile";
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "tl.errEmail";
  if (d.residence.line.trim().length < 10) e.residenceLine = "tl.errResidenceLine";
  if (!PIN.test(d.residence.pin)) e.residencePin = "tl.errResidencePin";
  if (x.documents < DOCS_MIN) e.documents = "tl.errDocuments";
  if (d.holder.trim().length < 3) e.holder = "tl.errHolder";
  if (!/^\d{9,18}$/.test(d.account)) e.account = "tl.errAccount";
  if (!d.account2) e.account2 = "tl.errAccount2";
  else if (d.account2 !== d.account) e.account2 = "tl.errAccountMismatch";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifsc)) e.ifsc = "tl.errIfsc";
  if (x.signature === 0) e.signature = "tl.errSignature";
  else if (x.signature < SIGNATURE_MIN_LENGTH) e.signature = "tl.errSignatureShort";
  if (!d.declared) e.declared = "tl.errDeclared";
  return e;
}

/** FIL-04: problems with a selection of supporting documents (empty when it can be attached). */
export function checkDocuments(files: { name: string; type: string; size: number }[]): { key: DictKey; name?: string }[] {
  if (files.length > DOCS_MAX) return [{ key: "tl.errDocumentsMany" }];
  const out: { key: DictKey; name?: string }[] = [];
  for (const f of files) {
    if (!DOC_TYPES.includes(f.type)) out.push({ key: "tl.errDocType", name: f.name });
    else if (f.size > MAX_DOC_BYTES) out.push({ key: "tl.errDocSize", name: f.name });
  }
  return out;
}

/** Account number for display: only the last four digits. */
export const maskAccount = (acc: string) => (acc.length > 4 ? `${"X".repeat(acc.length - 4)}${acc.slice(-4)}` : acc);

/** Total length of a set of strokes (each a list of points), in the points' units. */
export function strokeLength(strokes: { x: number; y: number }[][]): number {
  let total = 0;
  for (const s of strokes) for (let i = 1; i < s.length; i++) total += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return total;
}
