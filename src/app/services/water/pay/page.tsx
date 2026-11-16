import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { WaterPay } from "@/modules/water/WaterPay";

export const metadata: Metadata = { title: "Water Bill Payment" };

export default async function WaterPayPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { t } = await getT();
  const { ref } = await searchParams;
  return (
    <>
      <PageHead title={t("svc.water")} trail={[{ label: t("nav.services") }]} intro={t("wt.intro")} />
      <div className="container page">
        <WaterPay initialRef={ref ?? ""} />
      </div>
    </>
  );
}
