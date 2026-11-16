/** Input masking helpers shared by masked fields (TXT-02, TXT-03). */

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** Formats an Indian mobile number as "+91 98410 23456". Accepts with or without +91. */
export function formatMobile(raw: string): string {
  const d = mobileDigits(raw).slice(0, 10);
  if (!d) return "";
  return `+91 ${d.slice(0, 5)}${d.length > 5 ? " " + d.slice(5) : ""}`;
}

/** National digits only: drops an already-formatted "+91" prefix, or a bare 91 country code on 12+ digits. */
export function mobileDigits(raw: string): string {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("+91")) return digitsOnly(trimmed.slice(3));
  const d = digitsOnly(trimmed);
  return d.startsWith("91") && d.length > 10 ? d.slice(2) : d;
}

export const isValidMobile = (formatted: string) => /^[6-9]\d{9}$/.test(mobileDigits(formatted));

/** Masks a mobile for display: 98410 23456 → +91 98XXX XX456 */
export function maskMobile(digits: string): string {
  const d = mobileDigits(digits);
  return `+91 ${d.slice(0, 2)}XXX XX${d.slice(7)}`;
}

/** Astheen ID: ASP-NNNN-NNNN-C where C is a mod-10 check digit. */
export function formatAstheenId(raw: string): string {
  const d = digitsOnly(raw.replace(/^ASP/i, "")).slice(0, 9);
  if (!d) return "";
  const parts = [d.slice(0, 4), d.slice(4, 8), d.slice(8, 9)].filter(Boolean);
  return `ASP-${parts.join("-")}`;
}

export function astheenCheckDigit(eight: string): number {
  const sum = eight.split("").reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidAstheenId(value: string): boolean {
  const m = /^ASP-(\d{4})-(\d{4})-(\d)$/.exec(value);
  if (!m) return false;
  return astheenCheckDigit(m[1] + m[2]) === Number(m[3]);
}
