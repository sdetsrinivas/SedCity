/**
 * Math CAPTCHA (OTH-14). The challenge is drawn on a canvas; the server-less portal keeps the
 * operands in a hidden `captcha_token` field (base64 JSON) so the answer can be checked on submit.
 */
export interface Challenge {
  a: number;
  b: number;
  op: "+" | "-" | "×";
  ts: number;
}

export function newChallenge(rng: () => number = Math.random): Challenge {
  const ops: Challenge["op"][] = ["+", "-", "×"];
  const op = ops[Math.floor(rng() * ops.length)];
  let a = 2 + Math.floor(rng() * (op === "×" ? 8 : 18));
  let b = 1 + Math.floor(rng() * (op === "×" ? 8 : 9));
  if (op === "-" && b > a) [a, b] = [b, a];
  return { a, b, op, ts: Date.now() };
}

export function answerOf(c: Challenge): number {
  if (c.op === "+") return c.a + c.b;
  if (c.op === "-") return c.a - c.b;
  return c.a * c.b;
}

const b64encode = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s).toString("base64"));
const b64decode = (s: string) => (typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString());

export const encodeToken = (c: Challenge) => b64encode(JSON.stringify(c));

export function decodeToken(token: string): Challenge | null {
  try {
    const c = JSON.parse(b64decode(token));
    return typeof c.a === "number" && typeof c.b === "number" ? (c as Challenge) : null;
  } catch {
    return null;
  }
}

export function verifyCaptcha(token: string, answer: string): boolean {
  const c = decodeToken(token);
  return !!c && answer.trim() !== "" && Number(answer.trim()) === answerOf(c);
}
