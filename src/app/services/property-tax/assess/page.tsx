import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { PropertyTax } from "@/modules/property-tax/PropertyTax";

export const metadata: Metadata = { title: "Property Tax Self-Assessment" };

export default async function PropertyTaxPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.propertyTax")} trail={[{ label: t("nav.services") }]} intro={t("pt.intro")} />
      <div className="container page">
        <PropertyTax />
      </div>
    </>
  );
}
