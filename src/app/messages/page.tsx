import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { MessagesClient } from "@/modules/auth/MessagesClient";

export const metadata: Metadata = { title: "SMS Copies" };

export default async function MessagesPage() {
  const { t } = await getT();
  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <h1>{t("sms.title")}</h1>
      <p className="muted">{t("sms.subtitle")}</p>
      <MessagesClient />
    </div>
  );
}
