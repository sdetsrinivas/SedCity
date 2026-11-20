import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { OfficerQueue } from "@/modules/officer/OfficerQueue";

export const metadata: Metadata = { title: "Work Queue" };

export default async function OfficerQueuePage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("officer.title")} intro={t("oq.intro")} />
      <div className="container">
        <div className="page">
          <OfficerQueue />
        </div>
      </div>
    </>
  );
}
