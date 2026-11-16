"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import s from "./QuickTiles.module.css";

/**
 * BTN-01: the tiles look identical but are built from different elements:
 *  <a href> (Water, Property Tax, Birth) · <button> (Electricity) · plain <div onClick> with no role
 *  (Grievance) · <span onClick> (Booking) · <div role="link" tabindex=0> (Trade licence, Track).
 * Only the <a> tiles can be opened in a new tab; the div/span tiles are not keyboard reachable.
 */
export function QuickTiles() {
  const { t } = useT();
  const router = useRouter();
  const roleLink = (href: string) => ({
    role: "link" as const,
    tabIndex: 0,
    onClick: () => router.push(href),
    onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && router.push(href),
  });
  return (
    <section aria-labelledby="quick-services-title">
      <h2 id="quick-services-title" className={s.heading}>{t("home.quickServices")}</h2>
      <div className={s.grid}>
        <Link href="/services/water/pay" className={s.tile}>
          <span className={s.icon}><Icon name="drop" size={26} /></span>
          <span className={s.label}>{t("svc.water")}</span>
        </Link>
        <button type="button" className={s.tile} onClick={() => router.push("/services/electricity/new-connection")}>
          <span className={s.icon}><Icon name="bolt" size={26} /></span>
          <span className={s.label}>{t("svc.electricity")}</span>
        </button>
        <Link href="/services/property-tax/assess" className={s.tile}>
          <span className={s.icon}><Icon name="home" size={26} /></span>
          <span className={s.label}>{t("svc.propertyTax")}</span>
        </Link>
        <div className={s.tile} onClick={() => router.push("/grievances/new")}>
          <span className={s.icon}><Icon name="alert" size={26} /></span>
          <span className={s.label}>{t("svc.grievance")}</span>
        </div>
        <div className={s.tile} {...roleLink("/grievances/track")}>
          <span className={s.icon}><Icon name="search" size={26} /></span>
          <span className={s.label}>{t("svc.track")}</span>
        </div>
        <Link href="/certificates/birth" className={s.tile}>
          <span className={s.icon}><Icon name="baby" size={26} /></span>
          <span className={s.label}>{t("svc.birth")}</span>
        </Link>
        <div className={s.tile} {...roleLink("/certificates/trade-license")}>
          <span className={s.icon}><Icon name="shop" size={26} /></span>
          <span className={s.label}>{t("svc.trade")}</span>
        </div>
        <span className={s.tile} onClick={() => router.push("/bookings")}>
          <span className={s.icon}><Icon name="calendar" size={26} /></span>
          <span className={s.label}>{t("svc.booking")}</span>
        </span>
      </div>
    </section>
  );
}
