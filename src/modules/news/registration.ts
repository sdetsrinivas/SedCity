import type { DictKey } from "@/i18n";
import { store } from "@/mock/store";

export const MAX_ATTENDEES = 4;

export interface RegistrationInput {
  name: string;
  mobile: string;
  attendees: number;
}

export interface EventRegistration extends RegistrationInput {
  ref: string;
  at: string;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, DictKey>>;

export function validateRegistration(v: RegistrationInput, seatsLeft: number | null): RegistrationErrors {
  const e: RegistrationErrors = {};
  if (v.name.trim().length < 2) e.name = "ev.errName";
  if (!/^[6-9]\d{9}$/.test(v.mobile)) e.mobile = "ev.errMobile";
  if (!Number.isInteger(v.attendees) || v.attendees < 1 || v.attendees > MAX_ATTENDEES) e.attendees = "ev.errAttendees";
  else if (seatsLeft !== null && v.attendees > seatsLeft) e.attendees = "ev.errSeats";
  return e;
}

/** Registrations made in this browser, by event slug (localStorage `amc.eventRegistrations`). */
export const listRegistrations = () => store.get<Record<string, EventRegistration>>("eventRegistrations", {});
export const registrationFor = (slug: string): EventRegistration | undefined => listRegistrations()[slug];

export function saveRegistration(slug: string, input: RegistrationInput, now = new Date()): EventRegistration {
  const all = listRegistrations();
  const counter = store.get<number>("eventRegCounter", 1200 + Math.floor(Math.random() * 300)) + 1;
  store.set("eventRegCounter", counter);
  const reg: EventRegistration = { ...input, name: input.name.trim(), ref: `EVR/${now.getFullYear()}/${String(counter).padStart(5, "0")}`, at: now.toISOString() };
  store.set("eventRegistrations", { ...all, [slug]: reg });
  return reg;
}
