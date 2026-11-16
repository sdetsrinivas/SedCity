import type { AssessmentRecord } from "@/mock/endpoints/property";
import type { PayMethod } from "@/modules/water/payment";
import type { Floor, Rebate, Usage } from "./tax";

/** Result of verifying the assessment number (TXT-13). */
export type CheckStatus = "idle" | "format" | "checking" | "found" | "notFound" | "paid" | "error";

export interface Draft {
  assessmentNo: string;
  check: CheckStatus;
  record: AssessmentRecord | null;
  localityId: string;
  usage: Usage | null;
  age: number;
  floors: Floor[];
  rebates: Rebate[];
  method: PayMethod | null;
}

export type ErrorKey = "assessment" | "locality" | "usage" | "floors" | "method";
