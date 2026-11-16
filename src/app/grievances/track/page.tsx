import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { GrievanceTracker } from "@/modules/grievance/GrievanceTracker";
import s from "@/modules/grievance/Track.module.css";

export const metadata: Metadata = { title: "Track Grievance" };

export default async function GrievanceTrackPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.track")} trail={[{ label: t("nav.grievances") }]} intro={t("gt.intro")} />
      <div className={`container page ${s.layout}`}>
        <GrievanceTracker />
        <aside className={`card no-print ${s.aside}`} aria-labelledby="gt-aside-title">
          <div className="card-title"><h2 id="gt-aside-title">{t("gt.asideTitle")}</h2></div>
          <div className="card-body">
            <ul>
              <li>{t("gt.aside1")}</li>
              <li>{t("gt.aside2")}</li>
              <li>{t("gt.aside3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
