/** Site inspections run 9:00 AM – 5:30 PM in quarter-hour slots, with no visits in the 1 PM lunch hour. */
export const HOURS = [9, 10, 11, 12, 14, 15, 16, 17];
export const MINUTES = [0, 15, 30, 45];
export const LAST_SLOT = "17:30";

const pad = (n: number) => String(n).padStart(2, "0");

export const toValue = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

export function parseValue(v: string): { h: number; m: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(v);
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

export const isSlotAllowed = (h: number, m: number) =>
  HOURS.includes(h) && MINUTES.includes(m) && toValue(h, m) <= LAST_SLOT;

/** 12-hour clock text for an hour: 9 → "09", 14 → "02". */
export const hour12 = (h: number) => pad(((h + 11) % 12) + 1);
export const isPM = (h: number) => h >= 12;

/** "14:30" → "02:30 PM" (the AM/PM words come from the dictionary). */
export function formatTime(v: string, am: string, pm: string): string {
  const p = parseValue(v);
  return p ? `${hour12(p.h)}:${pad(p.m)} ${isPM(p.h) ? pm : am}` : "";
}
