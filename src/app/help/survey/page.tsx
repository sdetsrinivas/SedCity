import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { SurveyFrame } from "@/modules/help/SurveyFrame";
import s from "@/modules/help/Survey.module.css";

export const metadata: Metadata = { title: "Rate our services" };

export default async function SurveyPage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("survey.title")} trail={[{ label: t("help.title"), href: "/help" }]} intro={t("survey.intro")} />
      <div className="container">
        <div className={`page ${s.layout}`}>
          <div className={`card ${s.main}`}>
            <SurveyFrame />
          </div>
          <aside className={`card card-body ${s.side}`} aria-labelledby="survey-about">
            <h2 id="survey-about">{t("survey.aboutTitle")}</h2>
            <p>{t("survey.about1")}</p>
            <p>{t("survey.about2")}</p>
            <ul>
              <li><Link href="/grievances/new">{t("survey.grievance")}</Link></li>
              <li><Link href="/help">{t("survey.back")}</Link></li>
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
