import geo from "../data/geo.json";
import property from "../data/property.json";
import { call } from "../api";
import { store } from "../store";
import { streetById, wardById } from "./geo";
import type { Occupancy, Usage } from "@/modules/property-tax/tax";

/** A locality is a ward, named without its "Ward N –" prefix; its zone decides the base rate. */
export interface Locality {
  id: string;
  wardNo: number;
  name: { en: string; ta: string };
  baseRate: number;
}

const stripWard = (s: string) => s.replace(/^[^–]*–\s*/, "");

export const LOCALITIES: Locality[] = geo.wards.map((w) => ({
  id: w.id,
  wardNo: w.no,
  name: { en: stripWard(w.en), ta: stripWard(w.ta) },
  baseRate: property.baseRateByZone[w.zoneId as keyof typeof property.baseRateByZone],
}));

export const localityById = (id: string) => LOCALITIES.find((l) => l.id === id);

export const LOCALITY_PAGE_SIZE = 10;

export interface LocalityPage {
  items: Locality[];
  hasMore: boolean;
}

export const localityPage = (page: number): LocalityPage => {
  const start = page * LOCALITY_PAGE_SIZE;
  return { items: LOCALITIES.slice(start, start + LOCALITY_PAGE_SIZE), hasMore: start + LOCALITY_PAGE_SIZE < LOCALITIES.length };
};

/** DRP-06: the locality list arrives ten at a time, each page after LOCALITY_PAGE (700ms). */
export const listLocalities = (page: number) => call("LOCALITY_PAGE", () => localityPage(page));

export interface AssessmentRecord {
  no: string;
  owner: { en: string; ta: string };
  address: string;
  ward: { en: string; ta: string };
  usage: Usage;
  builtYear: number;
  floors: { level: number; area: number; occupancy: Occupancy }[];
  /** Receipt number when this browser has already paid the current half-year. */
  paidReceipt: string | null;
}

/** TXT-13: the assessment number is verified by this call (ASSESSMENT_CHECK, 1s). Null = no such property. */
export const checkAssessment = (no: string, period: string) =>
  call("ASSESSMENT_CHECK", (): AssessmentRecord | null => {
    const a = property.assessments.find((x) => x.no === no);
    if (!a) return null;
    const street = streetById(a.streetId)!;
    const ward = wardById(street.wardId)!;
    return {
      no: a.no,
      owner: a.owner,
      address: `${a.door}, ${street.name}, Astheenapuram ${street.pincode}`,
      ward: { en: ward.en, ta: ward.ta },
      usage: a.usage as Usage,
      builtYear: a.builtYear,
      floors: a.floors.map((f) => ({ ...f, occupancy: f.occupancy as Occupancy })),
      paidReceipt: taxPayments()[`${a.no}|${period}`] ?? null,
    };
  });

/** Receipt number per "assessmentNo|period" paid on this browser. */
export const taxPayments = () => store.get<Record<string, string>>("taxPayments", {});

export function recordTaxPayment(assessmentNo: string, period: string, receiptNo: string): void {
  store.set("taxPayments", { ...taxPayments(), [`${assessmentNo}|${period}`]: receiptNo });
}
