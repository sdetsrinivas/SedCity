import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { TradeForm } from "@/modules/certificates/TradeForm";
import s from "@/modules/certificates/Certificates.module.css";

export const metadata: Metadata = { title: "Trade Licence" };

export default async function TradeLicencePage() {
  const { t } = await getT();
  return (
    <>
      <PageHead title={t("svc.trade")} trail={[{ label: t("bc.trail") }]} intro={t("tl.intro")} />
      <div className={`container page ${s.layout}`}>
        <TradeForm />
        <aside className={`card ${s.aside}`} aria-labelledby="tl-aside-title">
          <div className="card-title"><h2 id="tl-aside-title">{t("tl.asideTitle")}</h2></div>
          <div className="card-body">
            <ul>
              <li>{t("tl.aside1")}</li>
              <li>{t("tl.aside2")}</li>
              <li>{t("tl.aside3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
