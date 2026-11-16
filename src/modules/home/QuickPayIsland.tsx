"use client";
import { delayedIsland } from "@/components/DelayedHydration";

// HYD-01: the Quick Pay card (and its "Pay now" button) is visible immediately but stays inert
// until HYDRATE_HOME (4s) has elapsed and its chunk hydrates. Clicks before that are ignored.
export const QuickPayIsland = delayedIsland("HYDRATE_HOME", () => import("./QuickPay"));
