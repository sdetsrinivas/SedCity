import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { BirthForm } from "@/modules/certificates/BirthForm";
import s from "@/modules/certificates/Certificates.module.css";

export const metadata: Metadata = { title: "Birth Certificate" };

export default async function BirthCertificatePage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.birth")} trail={[{ label: t("bc.trail") }]} intro={t("bc.intro")} />
      <div className={`container page ${s.layout}`}>
        <BirthForm />
        <aside className={`card ${s.aside}`} aria-labelledby="bc-aside-title">
          <div className="card-title"><h2 id="bc-aside-title">{t("bc.asideTitle")}</h2></div>
          <div className="card-body">
            <ul>
              <li>{t("bc.aside1")}</li>
              <li>{t("bc.aside2")}</li>
              <li>{t("bc.aside3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
