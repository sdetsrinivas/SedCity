/**
 * AstheenPay: the (fictional) payment gateway the portal hands off to (water bills, property tax). Sessions live in localStorage
 * so the checkout page works the same in the same-origin iframe (FRM-01) and in the popup (DLG-15).
 */
import { call } from "../api";
import { store } from "../store";
import type { PayMethod } from "@/modules/water/payment";

/** What the payment is for; the checkout words its order summary from this. */
export type PayOrder =
  | { kind: "water"; consumerNo: string; billNo: string }
  | { kind: "propertyTax"; assessmentNo: string; half: 1 | 2; fy: string };

export interface PaySession {
  id: string;
  order: PayOrder;
  amount: number;
  fee: number;
  method: PayMethod;
  email: string | null;
  createdAt: string;
  status: "pending" | "paid" | "cancelled";
  otp?: string;
  txnId?: string;
  paidAt?: string;
  instrument?: string;
}

/** Messages the checkout posts to the page that opened it (window.parent or window.opener). */
export interface GatewayMessage {
  source: "astheenpay";
  session: string;
  type: "result" | "resize";
  status?: "paid" | "cancelled";
  height?: number;
}

const KEY = "paySessions";
const all = () => store.get<Record<string, PaySession>>(KEY, {});
const put = (s: PaySession) => store.set(KEY, { ...all(), [s.id]: s });

export const getPaySession = (id: string): PaySession | null => all()[id] ?? null;

const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

export function createPaySession(input: Omit<PaySession, "id" | "createdAt" | "status">): PaySession {
  const s: PaySession = { ...input, id: `aps_${Date.now().toString(36)}${randomDigits(4)}`, createdAt: new Date().toISOString(), status: "pending" };
  put(s);
  return s;
}

export function cancelPaySession(id: string): void {
  const s = getPaySession(id);
  if (s && s.status === "pending") put({ ...s, status: "cancelled" });
}

/** FRM-01 / DLG-15: the checkout shows "Connecting securely…" until this resolves (GATEWAY_LOAD). */
export const loadPaySession = (id: string) => call("GATEWAY_LOAD", () => getPaySession(id));

/** DLG-08: generates the one-time password; the caller delivers it by SMS. */
export const sendPayOtp = (id: string, instrument: string) =>
  call("GATEWAY_OTP_SEND", () => {
    const s = getPaySession(id);
    if (!s || s.status !== "pending") return null;
    const otp = randomDigits(6);
    put({ ...s, otp, instrument });
    return otp;
  });

/** DLG-08: true when the OTP matches; the session is then marked paid with a transaction id. */
export const verifyPayOtp = (id: string, otp: string) =>
  call("GATEWAY_OTP_VERIFY", () => {
    const s = getPaySession(id);
    if (!s || s.status !== "pending" || !s.otp || s.otp !== otp.trim()) return null;
    const paid: PaySession = { ...s, status: "paid", txnId: `APY${Date.now().toString().slice(-10)}${randomDigits(2)}`, paidAt: new Date().toISOString() };
    delete paid.otp;
    put(paid);
    return paid;
  });
