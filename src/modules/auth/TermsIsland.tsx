"use client";
import { delayedIsland } from "@/components/DelayedHydration";

// CHK-09: terms checkbox is server-rendered but its island only hydrates after HYDRATE_REGISTER (3s).
// Before that, React has attached no listeners to it.
export const TermsIsland = delayedIsland("HYDRATE_REGISTER", () => import("./TermsCheckbox"));
