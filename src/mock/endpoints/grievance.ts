import data from "../data/grievance.json";
import { call } from "../api";

export type Category = (typeof data.categories)[number];

export const CATEGORIES: Category[] = data.categories;
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

export interface GrievancePayload {
  category: string;
  ward: string;
  description: string;
  inspectionTime: string;
  photos: string[];
  name: string;
  mobile: string;
}

/** Registers a grievance with the ward office (GRIEVANCE_SUBMIT). */
export const submitGrievance = (payload: GrievancePayload) =>
  call("GRIEVANCE_SUBMIT", () => ({ received: true, slaDays: categoryById(payload.category)?.slaDays ?? 7 }));
