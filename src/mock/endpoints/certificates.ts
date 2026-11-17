import data from "../data/certificates.json";
import { call } from "../api";

export type Hospital = (typeof data.hospitals)[number];

export const HOSPITALS: Hospital[] = data.hospitals;
export const hospitalById = (id: string) => HOSPITALS.find((h) => h.id === id);
export const BIRTH_FEES = data.birthFees;

export interface BirthPayload {
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
  proof: string;
  delivery: string;
  copies: number;
}

/** Sends a birth certificate application to the Registrar of Births (BIRTH_SUBMIT). */
export const submitBirthApplication = (payload: BirthPayload) =>
  call("BIRTH_SUBMIT", () => ({ received: true, readyInDays: 7, copies: payload.copies }));

// ── Trade licence ────────────────────────────────────────────────

export type TradeGroup = (typeof data.tradeGroups)[number];
export type TradeCategory = TradeGroup["categories"][number];

export const TRADE_GROUPS: TradeGroup[] = data.tradeGroups;
export const TRADE_FEES = data.tradeFees;
export const tradeCategoryById = (id: string) => TRADE_GROUPS.flatMap((g) => g.categories).find((c) => c.id === id);
export const tradeGroupOf = (id: string) => TRADE_GROUPS.find((g) => g.categories.some((c) => c.id === id));

/**
 * Annual licence fee in rupees: the category's base fee plus a charge for every started block of
 * floor area beyond the free area. Null for an unknown category or an invalid area.
 */
export function tradeFee(categoryId: string, areaSqFt: number): number | null {
  const c = tradeCategoryById(categoryId);
  if (!c || !Number.isFinite(areaSqFt) || areaSqFt <= 0) return null;
  const extra = Math.max(0, areaSqFt - TRADE_FEES.freeArea);
  return c.fee + Math.ceil(extra / TRADE_FEES.stepArea) * TRADE_FEES.perStep;
}

/** Fee quote from the licensing section (TRADE_FEE): shown in the fee badge. */
export const quoteTradeFee = (categoryId: string, areaSqFt: number) =>
  call("TRADE_FEE", () => ({ fee: tradeFee(categoryId, areaSqFt) }));

export interface TradePayload {
  businessName: string;
  category: string;
  area: number;
  ward: string;
  ownership: string;
  ownerName: string;
  mobile: string;
  documents: string[];
  accountLast4: string;
  signed: boolean;
}

/** Sends a trade licence application to the Licensing section (TRADE_SUBMIT). */
export const submitTradeApplication = (payload: TradePayload) =>
  call("TRADE_SUBMIT", () => ({ received: true, inspectionInDays: 10, fee: tradeFee(payload.category, payload.area) }));
