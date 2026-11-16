"use client";
import { store } from "@/mock/store";

export interface Sms {
  id: string;
  to: string;
  sender: string;
  body: string;
  at: string;
  read: boolean;
}

export const SMS_EVENT = "amc:sms";

export function listSms(): Sms[] {
  return store.get<Sms[]>("sms", []);
}

export function pushSms(to: string, body: string, sender = "AD-AMCGOV"): Sms {
  const sms: Sms = { id: Math.random().toString(36).slice(2, 10), to, sender, body, at: new Date().toISOString(), read: false };
  store.set("sms", [sms, ...listSms()].slice(0, 50));
  window.dispatchEvent(new Event(SMS_EVENT));
  return sms;
}

export function markAllRead(): void {
  store.set("sms", listSms().map((s) => ({ ...s, read: true })));
  window.dispatchEvent(new Event(SMS_EVENT));
}
