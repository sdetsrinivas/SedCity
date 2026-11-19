import type { Metadata } from "next";
import { OfficeMap } from "@/modules/directory/OfficeMap";

export const metadata: Metadata = { title: { absolute: "Map of Corporation offices" }, robots: { index: false } };

/** The office map, shown inside the map frame of /directory/offices (FRM-04). */
export default function OfficeMapPage() {
  return <OfficeMap />;
}
