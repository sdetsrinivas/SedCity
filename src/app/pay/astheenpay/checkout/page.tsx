import type { Metadata } from "next";
import { Checkout } from "@/modules/astheenpay/Checkout";

export const metadata: Metadata = { title: { absolute: "AstheenPay – Secure checkout" }, robots: { index: false } };

/** The AstheenPay gateway. Opened by /services/water/pay in an iframe (view=frame) or a popup (view=window). */
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ session?: string; view?: string }> }) {
  const { session, view } = await searchParams;
  return <Checkout sessionId={session ?? ""} view={view === "window" ? "window" : "frame"} />;
}
