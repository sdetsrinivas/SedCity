import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { GrievanceForm } from "@/modules/grievance/GrievanceForm";
import s from "@/modules/grievance/Grievance.module.css";

export const metadata: Metadata = { title: "Register a Grievance" };

export default async function GrievanceNewPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.grievance")} trail={[{ label: t("nav.grievances") }]} intro={t("gr.intro")} />
      <div className={`container page ${s.layout}`}>
        <GrievanceForm />
        <aside className={`card ${s.aside}`} aria-labelledby="gr-aside-title">
          <div className="card-title"><h2 id="gr-aside-title">{t("gr.asideTitle")}</h2></div>
          <div className="card-body">
            <ul>
              <li>{t("gr.aside1")}</li>
              <li>{t("gr.aside2")}</li>
              <li>{t("gr.aside3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
