import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { Wizard } from "@/modules/electricity/Wizard";

export const metadata: Metadata = { title: "New Electricity Connection" };

export default async function NewConnectionPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("el.title")} trail={[{ label: t("nav.services") }]} intro={t("el.intro")} />
      <div className="container page">
        <p className="small muted">{t("el.signInHint")} <Link href="/login?next=/services/electricity/new-connection">{t("nav.login")}</Link></p>
        <Wizard />
      </div>
    </>
  );
}
