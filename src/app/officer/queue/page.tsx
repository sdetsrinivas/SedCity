import type { Metadata } from "next";
import { OfficerHome } from "@/modules/auth/OfficerHome";

export const metadata: Metadata = { title: "Work Queue" };

export default function OfficerQueuePage() {
  return <div className="container page"><OfficerHome /></div>;
}
