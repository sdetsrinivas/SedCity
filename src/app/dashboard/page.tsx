import type { Metadata } from "next";
import { DashboardHome } from "@/modules/auth/DashboardHome";

export const metadata: Metadata = { title: "My Dashboard" };

export default function DashboardPage() {
  return <div className="container page"><DashboardHome /></div>;
}
