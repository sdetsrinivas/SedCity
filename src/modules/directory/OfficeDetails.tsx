"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { HELPLINE, officeKind, officePhoneHref, officeServices, type Office } from "@/mock/endpoints/directory";
import { formatKm, wardName, zoneName, locality } from "./offices";
import s from "./Offices.module.css";

const DAYS = ["off.mon", "off.tue", "off.wed", "off.thu", "off.fri", "off.sat", "off.sun"] as const;

/**
 * DYN-08: the office details are two scroll boxes, one inside the other. The panel body scrolls on its
 * own (fixed max-height, `overscroll-behavior: contain`, so wheel scrolling over it never moves the page),
 * and inside it the “Services at this office” list is a second scroll box with a few rows showing. A
 * service at the end of the list is in the DOM and “visible”, yet outside the viewport until both boxes
 * are scrolled; scrolling the window does not bring it into view.
 */
export function OfficeDetails({ office, km }: { office: Office; km?: number }) {
  const { t, lang } = useT();
  const kind = officeKind(office.kind);
  const services = officeServices(office.kind);

  return (
    <section className={`card ${s.details}`} aria-labelledby="office-details-title">
      <div className="card-title">
        <h2 id="office-details-title">{t("off.detailsTitle")}</h2>
      </div>
      <div className={s.detailsScroll} tabIndex={0} role="region" aria-labelledby="office-name">
        <div className={s.detailsHead}>
          <span className="badge">{pick(kind, lang)}</span>
          <h3 id="office-name" className={s.officeName}>{pick(office.name, lang)}</h3>
          {km !== undefined && <p className={s.fromYou}>{t("off.fromYou", { km: formatKm(km, lang) })}</p>}
        </div>

        <dl className={s.facts}>
          <dt>{t("off.address")}</dt>
          <dd>
            {office.street}, {locality(office, lang)}
            <br />
            {t("off.cityPin", { pincode: office.pincode })}
          </dd>
          <dt>{t("off.ward")}</dt>
          <dd>{wardName(office, lang)}</dd>
          <dt>{t("off.zone")}</dt>
          <dd>{zoneName(office, lang)}</dd>
          <dt>{t("off.phone")}</dt>
          <dd>
            <a href={officePhoneHref(office)} className={s.phone}>{HELPLINE} · {t("dir.ext", { ext: office.ext })}</a>
          </dd>
        </dl>

        <h4 className={s.subhead} id="office-hours">{t("off.hours")}</h4>
        <table className={`data-table ${s.hours}`} aria-labelledby="office-hours">
          <tbody>
            {kind.hours.map((h, i) => (
              <tr key={DAYS[i]}>
                <th scope="row">{t(DAYS[i])}</th>
                <td>{h ? `${h[0]} – ${h[1]}` : t("off.closed")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className={s.subhead} id="office-services">{t("off.services")}</h4>
        {/* DYN-08: the inner scroll box. */}
        <ul className={s.services} aria-labelledby="office-services">
          {services.map((svc) => (
            <li key={svc.id}>
              {svc.href ? <Link href={svc.href}>{pick(svc, lang)}</Link> : <span>{pick(svc, lang)}</span>}
              {svc.href && <span className={s.online}>{t("off.online")}</span>}
            </li>
          ))}
        </ul>

        <p className={s.note}>{t("off.holidayNote")}</p>
      </div>
    </section>
  );
}
