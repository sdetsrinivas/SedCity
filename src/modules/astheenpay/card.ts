/** Pure validation helpers for the AstheenPay checkout. */

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** "4111111111111111" → "4111 1111 1111 1111" (max 19 digits). */
export const groupCardNumber = (s: string) => digitsOnly(s).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

export function luhnValid(s: string): boolean {
  const d = digitsOnly(s);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** "0329" / "03/29" → "03/29" while typing. */
export function formatExpiry(s: string): string {
  const d = digitsOnly(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** MM/YY that is a real month and not before the current month. */
export function expiryValid(s: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year * 12 + month >= now.getFullYear() * 12 + now.getMonth() + 1;
}

export const cvvValid = (s: string) => /^\d{3}$/.test(s.trim());
export const upiValid = (s: string) => /^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(s.trim());
export const nameValid = (s: string) => s.trim().length >= 2;

export const maskCard = (s: string) => `•••• ${digitsOnly(s).slice(-4)}`;
