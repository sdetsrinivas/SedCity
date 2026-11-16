/** Pure helpers for paying a water bill: partial-payment bounds, slider stepping and convenience fees. */

export type PayMethod = "card" | "upi" | "netbanking";
export const PAY_METHODS: PayMethod[] = ["card", "upi", "netbanking"];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Partial payments move in ₹10 steps. */
export const PAY_STEP = 10;
/** Smallest part payment accepted, and bills below twice this must be paid in full. */
export const MIN_PART_PAYMENT = 100;

export interface PayBounds {
  min: number;
  max: number;
  step: number;
}

/**
 * OTH-02: the partial-payment slider runs from at least ₹100 (or a quarter of the bill, rounded up
 * to ₹10) to the full amount. Bills under ₹200 cannot be paid in part (min === max).
 */
export function payBounds(total: number): PayBounds {
  const max = round2(total);
  if (max < MIN_PART_PAYMENT * 2) return { min: max, max, step: PAY_STEP };
  const quarter = Math.ceil(max / 4 / PAY_STEP) * PAY_STEP;
  return { min: Math.max(MIN_PART_PAYMENT, quarter), max, step: PAY_STEP };
}

/** The largest step value (min + k·step) that is ≤ v. */
const gridFloor = (v: number, b: PayBounds) => round2(b.min + Math.floor((v - b.min) / b.step + 1e-9) * b.step);

/** Value under a pointer at `ratio` (0..1) along the track; the last half-step snaps to the exact total. */
export function valueAtRatio(ratio: number, b: PayBounds): number {
  const r = Math.min(1, Math.max(0, ratio));
  const raw = b.min + r * (b.max - b.min);
  if (raw >= b.max - b.step / 2) return b.max;
  return Math.min(b.max, round2(b.min + Math.round((raw - b.min) / b.step) * b.step));
}

/** Keyboard stepping: `steps` > 0 moves up, < 0 moves down, always landing on the grid or on the exact total. */
export function stepValue(v: number, steps: number, b: PayBounds): number {
  let out = v;
  for (let i = 0; i < Math.abs(steps); i++) {
    if (steps > 0) {
      const next = round2(gridFloor(out, b) + b.step);
      out = next >= b.max ? b.max : next;
    } else {
      const g = gridFloor(out, b);
      out = Math.max(b.min, g < out ? g : round2(g - b.step));
    }
  }
  return out;
}

export const ratioOf = (v: number, b: PayBounds) => (b.max === b.min ? 1 : (v - b.min) / (b.max - b.min));

/** Convenience fee charged by the gateway: card 1%, UPI free, net banking ₹10 flat. */
export function convenienceFee(method: PayMethod, amount: number): number {
  if (method === "card") return round2(amount * 0.01);
  if (method === "netbanking") return 10;
  return 0;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
