import Link from "next/link";
import { getT } from "@/i18n/server";
import { Seal } from "./Seal";
import { VisitCounter } from "./VisitCounter";
import s from "./Footer.module.css";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className={s.footer}>
      <div className={`container ${s.grid}`}>
        <div>
          <div className={s.brand}><Seal size={44} /><strong>{t("corp.name")}</strong></div>
          <p className={s.about}>{t("footer.aboutBody")}</p>
          <p className={s.motto}>{t("corp.motto")}</p>
        </div>
        <div>
          <h2>{t("footer.quickLinks")}</h2>
          <ul>
            <li><Link href="/services/water/pay">{t("svc.water")}</Link></li>
            <li><Link href="/services/property-tax/assess">{t("svc.propertyTax")}</Link></li>
            <li><Link href="/grievances/track">{t("svc.track")}</Link></li>
            <li><Link href="/directory/offices">{t("svc.offices")}</Link></li>
            <li><Link href="/messages">{t("nav.messages")}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{t("footer.policies")}</h2>
          <ul>
            <li><Link href="/info/terms">{t("footer.terms")}</Link></li>
            <li><Link href="/info/privacy">{t("footer.privacy")}</Link></li>
            <li><Link href="/info/accessibility">{t("footer.accessibility")}</Link></li>
            <li><Link href="/info/rti">{t("footer.rti")}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{t("footer.contact")}</h2>
          <address className={s.address}>
            {t("footer.address")}<br />
            {t("top.helpline")}: <a href="tel:1552026">155 2026</a><br />
            <a href="mailto:care@amc.example">care@amc.example</a>
          </address>
        </div>
      </div>
      <div className={s.bottom}>
        <div className={`container ${s.bottomInner}`}>
          <span>© 2026 {t("footer.copyright")}</span>
          <span>{t("footer.updated")}: 14/11/2026 · <VisitCounter label={t("footer.visitors")} /></span>
        </div>
      </div>
    </footer>
  );
}
