import data from "../data/certificates.json";
import { call } from "../api";

export type Hospital = (typeof data.hospitals)[number];

export const HOSPITALS: Hospital[] = data.hospitals;
export const hospitalById = (id: string) => HOSPITALS.find((h) => h.id === id);
export const BIRTH_FEES = data.birthFees;

export interface BirthPayload {
  childName: string;
  sex: string;
  dob: string;
  hospital: string;
  place: string;
  motherName: string;
  fatherName: string;
  applicantType: string;
  applicantName: string;
  mobile: string;
  proof: string;
  delivery: string;
  copies: number;
}

/** Sends a birth certificate application to the Registrar of Births (BIRTH_SUBMIT). */
export const submitBirthApplication = (payload: BirthPayload) =>
  call("BIRTH_SUBMIT", () => ({ received: true, readyInDays: 7, copies: payload.copies }));
