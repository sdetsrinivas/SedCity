import type { DelayName } from "../src/mock/delays";

export type TrapCategory =
  | "Checkbox" | "Radio" | "Text input" | "Dropdown" | "Buttons & links" | "Dialogs & popups"
  | "Frames" | "Shadow DOM" | "Hydration" | "Waits & dynamic content" | "Tables" | "Date & time"
  | "Files" | "Other";

export const CATEGORY_PREFIX: Record<string, TrapCategory> = {
  CHK: "Checkbox", RAD: "Radio", TXT: "Text input", DRP: "Dropdown", BTN: "Buttons & links",
  DLG: "Dialogs & popups", FRM: "Frames", SHD: "Shadow DOM", HYD: "Hydration",
  DYN: "Waits & dynamic content", TBL: "Tables", DAT: "Date & time", FIL: "Files", OTH: "Other",
};

export interface Trap {
  /** e.g. CHK-01 — also used in code comments and verification test titles. */
  id: string;
  category: TrapCategory;
  /** Short name of the variant. */
  title: string;
  route: string;
  /** Flow / step / element on the page where it lives. */
  flow: string;
  description: string;
  /** How it is implemented (and where). */
  implementation: string;
  /** Source files containing the trap ID comment. */
  files: string[];
  whyHard: string;
  selenium: string;
  playwright: string;
  /** What a test should assert to prove it handled the trap. */
  assert: string;
  difficulty: "Easy" | "Medium" | "Hard";
  delays: DelayName[];
}
