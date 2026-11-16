/** Pure helpers for water bills: consumer number format, slab-wise charges and amount display. */
import { formatINR } from "@/lib/format";

export type WaterCategory = "domestic" | "commercial";

export interface Slab {
  /** Upper bound in kL for this slab; null = no upper bound. */
  upTo: number | null;
  /** ₹ per kL. */
  rate: number;
}

export interface SlabLine {
  from: number;
  to: number | null;
  units: number;
  rate: number;
  amount: number;
}

export interface Tariff {
  slabs: Slab[];
  meterRent: number;
}

export interface Charges {
  slabs: SlabLine[];
  water: number;
  sewerage: number;
  meterRent: number;
  arrears: number;
  lateFee: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * TXT-04: the consumer number is reformatted only when the field loses focus.
 * Accepts any spacing, separators and case ("w 02 014 00731", "0201400731") and returns
 * the canonical "W02-014-00731", or null when it does not hold exactly 10 digits.
 */
export function normalizeConsumerNo(raw: string): string | null {
  const compact = raw.replace(/[^0-9a-z]/gi, "").toUpperCase().replace(/^W/, "");
  if (!/^\d{10}$/.test(compact)) return null;
  return `W${compact.slice(0, 2)}-${compact.slice(2, 5)}-${compact.slice(5)}`;
}

/** Splits consumption (kL) across the tariff slabs. */
export function slabBreakup(consumption: number, slabs: Slab[]): SlabLine[] {
  const lines: SlabLine[] = [];
  let from = 0;
  for (const slab of slabs) {
    if (consumption <= from) break;
    const top = slab.upTo ?? Infinity;
    const units = Math.min(consumption, top) - from;
    lines.push({ from, to: slab.upTo, units, rate: slab.rate, amount: round2(units * slab.rate) });
    from = top;
  }
  return lines;
}

export function computeCharges(
  consumption: number,
  tariff: Tariff,
  opts: { seweragePercent: number; latePercent: number; arrears: number },
): Charges {
  const slabs = slabBreakup(consumption, tariff.slabs);
  const water = round2(slabs.reduce((sum, l) => sum + l.amount, 0));
  const sewerage = round2((water * opts.seweragePercent) / 100);
  const arrears = round2(opts.arrears);
  const lateFee = arrears > 0 ? round2((arrears * opts.latePercent) / 100) : 0;
  const total = round2(water + sewerage + tariff.meterRent + arrears + lateFee);
  return { slabs, water, sewerage, meterRent: tariff.meterRent, arrears, lateFee, total };
}

/** OTH-12: "₹1,234.50" → { symbol: "₹", whole: "1,234", fraction: "50" } (rendered in separate spans). */
export function splitAmount(n: number): { symbol: string; whole: string; fraction: string } {
  const text = formatINR(n);
  const digitsAt = text.search(/\d/);
  const symbol = text.slice(0, digitsAt).trim();
  const [whole, fraction = "00"] = text.slice(digitsAt).split(".");
  return { symbol, whole, fraction };
}
