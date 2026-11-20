import Link from "next/link";
import { getT } from "@/i18n/server";
import { HELPLINE } from "@/mock/endpoints/directory";
import s from "./Help.module.css";

/** “Contact us”: helpline, email, head office and where to go next. */
export async function ContactPanel() {
  const { t } = await getT();
  return (
    <div className={s.contact}>
      <dl className={s.contactList}>
        <div>
          <dt>{t("help.contact.helpline")}</dt>
          <dd><a href={`tel:${HELPLINE.replace(/\s/g, "")}`}>{HELPLINE}</a><span className="muted small">{t("help.contact.helplineHours")}</span></dd>
        </div>
        <div>
          <dt>{t("help.contact.email")}</dt>
          <dd><a href="mailto:care@amc.example">care@amc.example</a><span className="muted small">{t("help.contact.emailNote")}</span></dd>
        </div>
        <div>
          <dt>{t("help.contact.office")}</dt>
          <dd>{t("footer.address")}<span className="muted small">{t("help.contact.officeHours")}</span></dd>
        </div>
      </dl>
      <ul className={s.nextLinks}>
        <li><Link href="/directory/offices">{t("help.contact.nearest")}</Link></li>
        <li><Link href="/grievances/new">{t("help.contact.grievance")}</Link></li>
        <li><Link href="/directory/officials">{t("help.contact.officials")}</Link></li>
        <li><Link href="/help/survey">{t("help.contact.survey")}</Link></li>
      </ul>
    </div>
  );
}
