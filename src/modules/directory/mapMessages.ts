import type { LatLng } from "@/mock/endpoints/directory";

/** The map page that the offices page shows in its map frame. */
export const OFFICE_MAP_URL = "/maps/offices";

/** Page → map frame: what to highlight. */
export interface MapState {
  source: "amc-offices";
  type: "state";
  selectedId: string | null;
  /** The position the browser shared, if any. */
  user: LatLng | null;
}

/** Map frame → page. */
export type MapEvent =
  | { source: "amc-map"; type: "ready" }
  | { source: "amc-map"; type: "select"; id: string };

export const isMapState = (d: unknown): d is MapState =>
  !!d && typeof d === "object" && (d as MapState).source === "amc-offices" && (d as MapState).type === "state";

export const isMapEvent = (d: unknown): d is MapEvent =>
  !!d && typeof d === "object" && (d as MapEvent).source === "amc-map";
