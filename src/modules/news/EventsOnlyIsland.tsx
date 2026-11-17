"use client";
import { delayedIsland } from "@/components/DelayedHydration";

// CHK-08: "Show events only" is server-rendered unchecked and hydrates after HYDRATE_NEWS (2s); only then
// is the choice saved in localStorage restored, so the box ticks itself and the list reloads.
export const EventsOnlyIsland = delayedIsland("HYDRATE_NEWS", () => import("./EventsOnlyToggle"));
