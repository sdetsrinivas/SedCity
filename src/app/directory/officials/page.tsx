import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { DEFAULT_QUERY, HELPLINE, queryOfficials } from "@/mock/endpoints/directory";
import { OfficialsDirectory } from "@/modules/directory/OfficialsDirectory";

export const metadata: Metadata = { title: "Officials Directory" };

export default async function OfficialsPage() {
  const { t, lang } = await getT();
  // HYD-04: always the first page of the whole directory; a filter in the address is applied after hydration.
  const first = queryOfficials(DEFAULT_QUERY, lang);
  return (
    <>
      <PageHead title={t("svc.directory")} trail={[{ label: t("nav.directory") }]} intro={t("dir.intro", { helpline: HELPLINE })} />
      <div className="container">
        <div className="page">
          <OfficialsDirectory initial={first} />
        </div>
      </div>
    </>
  );
}
