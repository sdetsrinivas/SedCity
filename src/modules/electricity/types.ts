import type { ConnType, Phase } from "@/mock/endpoints/electricity";

export interface FileMeta { name: string; size: number; type: string }

export interface Draft {
  connType: ConnType | "";
  phase: Phase | "";
  load: string;
  name: string;
  astheenId: string;
  mobile: string;
  email: string;
  zoneId: string;
  wardId: string;
  streetId: string;
  door: string;
  landmark: string;
  inspectionDate: string; // ISO yyyy-mm-dd
  idProof: FileMeta | null;
  ownershipProof: FileMeta | null;
}

export const EMPTY_DRAFT: Draft = {
  connType: "", phase: "", load: "", name: "", astheenId: "", mobile: "", email: "",
  zoneId: "", wardId: "", streetId: "", door: "", landmark: "", inspectionDate: "", idProof: null, ownershipProof: null,
};

export type Errors = Partial<Record<keyof Draft | "declare", string>>;

export interface StepProps {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  errors: Errors;
}
