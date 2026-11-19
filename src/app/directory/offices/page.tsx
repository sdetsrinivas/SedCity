import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { OfficeFinder } from "@/modules/directory/OfficeFinder";

export const metadata: Metadata = { title: "Find Nearest Office" };

export default async function OfficesPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.offices")} trail={[{ label: t("nav.directory"), href: "/directory/officials" }]} intro={t("off.intro")} />
      <div className="container">
        <div className="page">
          <OfficeFinder />
        </div>
      </div>
    </>
  );
}
