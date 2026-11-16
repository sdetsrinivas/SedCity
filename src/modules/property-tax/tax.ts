/**
 * Pure property-tax rules for the half-yearly self-assessment.
 *
 * Annual rental value (ARV) of a floor = plinth area × unit area value (UAV, ₹ per sq ft per month) × 12
 * × occupancy factor. UAV = the locality's notified base rate × the usage factor. Depreciation by building
 * age is taken off the total ARV, the annual tax is a fixed share of the net ARV and half of it is due
 * each half-year, less any rebates. The amount payable is rounded to the nearest rupee.
 */

export type Usage = "residential" | "commercial" | "mixed";
export const USAGES: Usage[] = ["residential", "commercial", "mixed"];

export type Occupancy = "self" | "rented";
export const OCCUPANCIES: Occupancy[] = ["self", "rented"];

export type Rebate = "senior" | "rainwater" | "solar";
export const REBATES: Rebate[] = ["senior", "rainwater", "solar"];

export interface Floor {
  id: string;
  /** 0 = ground floor, 1 = first floor, … */
  level: number;
  /** Plinth area in sq ft; null until the owner enters it. */
  area: number | null;
  occupancy: Occupancy;
}

export const USAGE_FACTOR: Record<Usage, number> = { residential: 1, mixed: 1.5, commercial: 2.5 };
export const OCCUPANCY_FACTOR: Record<Occupancy, number> = { self: 1, rented: 1.5 };
export const REBATE_RATE: Record<Rebate, number> = { senior: 0.05, rainwater: 0.02, solar: 0.03 };
/** General tax: 10% of the net annual rental value. */
export const TAX_RATE = 0.1;
export const MAX_FLOORS = 6;
export const AREA_MIN = 50;
export const AREA_MAX = 20000;
export const AGE_MAX = 80;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Depreciation on ARV by age of building: up to 10 years none, 11–25 10%, 26–40 20%, over 40 30%. */
export function depreciationRate(age: number): number {
  if (age <= 10) return 0;
  if (age <= 25) return 0.1;
  if (age <= 40) return 0.2;
  return 0.3;
}

export const unitAreaValue = (baseRate: number, usage: Usage) => round2(baseRate * USAGE_FACTOR[usage]);

export const floorArv = (f: Floor, uav: number) => (f.area ? round2(f.area * uav * 12 * OCCUPANCY_FACTOR[f.occupancy]) : 0);

/** Area typed into the floors table: whole sq ft between AREA_MIN and AREA_MAX, else null. */
export function parseArea(raw: string): number | null {
  const s = raw.replace(/,/g, "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= AREA_MIN && n <= AREA_MAX ? n : null;
}

export interface TaxInput {
  floors: Floor[];
  baseRate: number;
  usage: Usage;
  age: number;
  rebates: Rebate[];
}

export interface TaxBreakdown {
  uav: number;
  arv: number;
  depreciationRate: number;
  depreciation: number;
  netArv: number;
  annualTax: number;
  halfYearTax: number;
  rebateRate: number;
  rebate: number;
  payable: number;
}

export function computeTax({ floors, baseRate, usage, age, rebates }: TaxInput): TaxBreakdown {
  const uav = unitAreaValue(baseRate, usage);
  const arv = round2(floors.reduce((sum, f) => sum + floorArv(f, uav), 0));
  const rate = depreciationRate(age);
  const depreciation = round2(arv * rate);
  const netArv = round2(arv - depreciation);
  const annualTax = round2(netArv * TAX_RATE);
  const halfYearTax = round2(annualTax / 2);
  const rebateRate = round2(rebates.reduce((sum, r) => sum + REBATE_RATE[r], 0));
  const rebate = round2(halfYearTax * rebateRate);
  return { uav, arv, depreciationRate: rate, depreciation, netArv, annualTax, halfYearTax, rebateRate, rebate, payable: Math.round(halfYearTax - rebate) };
}

export interface HalfYear {
  half: 1 | 2;
  /** Financial year, e.g. "2026-27". */
  fy: string;
  /** Last date to pay without penalty (YYYY-MM-DD). */
  dueISO: string;
}

/** The financial year runs April–March: April–September is the first half, October–March the second. */
export function halfYearOf(d: Date): HalfYear {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  const fy = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  const half = m >= 4 && m <= 9 ? 1 : 2;
  return { half, fy, dueISO: half === 1 ? `${start}-09-30` : `${start + 1}-03-31` };
}

/** Assessment numbers are printed as NNN-NNN-NNNNN (ward, block, serial). */
export function normalizeAssessmentNo(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d{11}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
