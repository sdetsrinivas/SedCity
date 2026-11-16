"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon, type IconName } from "@/components/ui/Icon";
import s from "./Header.module.css";

interface MenuItem { key: DictKey; desc?: DictKey; href: string; icon: IconName }
export const SERVICE_GROUPS: { key: DictKey; items: MenuItem[] }[] = [
  { key: "menu.utilities", items: [
    { key: "svc.electricity", desc: "svc.electricity.desc", href: "/services/electricity/new-connection", icon: "bolt" },
    { key: "svc.water", desc: "svc.water.desc", href: "/services/water/pay", icon: "drop" },
  ] },
  { key: "menu.revenue", items: [
    { key: "svc.propertyTax", desc: "svc.propertyTax.desc", href: "/services/property-tax/assess", icon: "home" },
    { key: "svc.trade", desc: "svc.trade.desc", href: "/certificates/trade-license", icon: "shop" },
  ] },
  { key: "menu.certificates", items: [
    { key: "svc.birth", desc: "svc.birth.desc", href: "/certificates/birth", icon: "baby" },
  ] },
  { key: "menu.citizen", items: [
    { key: "svc.grievance", desc: "svc.grievance.desc", href: "/grievances/new", icon: "alert" },
    { key: "svc.track", desc: "svc.track.desc", href: "/grievances/track", icon: "search" },
    { key: "svc.booking", desc: "svc.booking.desc", href: "/bookings", icon: "calendar" },
  ] },
];

const LINKS: { key: DictKey; href: string }[] = [
  { key: "nav.grievances", href: "/grievances/new" },
  { key: "nav.news", href: "/news" },
  { key: "nav.directory", href: "/directory/officials" },
  { key: "nav.bookings", href: "/bookings" },
  { key: "nav.help", href: "/help" },
];

export function MainNav() {
  const { t } = useT();
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMegaOpen(false); setDrawer(false); }, [pathname]);

  // BTN-09: the Services mega-menu opens on mouseenter only. Clicking or focusing the
  // trigger does nothing, and the panel is not in the DOM until hovered.
  const enter = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setMegaOpen(true); };
  const leave = () => { closeTimer.current = setTimeout(() => setMegaOpen(false), 180); };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <nav className={s.nav} aria-label="Main">
      <div className={`container ${s.navInner}`}>
        <ul className={s.navList}>
          <li><Link href="/" className={`${s.navLink} ${pathname === "/" ? s.active : ""}`}>{t("nav.home")}</Link></li>
          <li className={s.megaHost} onMouseEnter={enter} onMouseLeave={leave}>
            <span className={`${s.navLink} ${s.navTrigger} ${pathname.startsWith("/services") || pathname.startsWith("/certificates") ? s.active : ""}`}>
              {t("nav.services")} <Icon name="chevronDown" size={14} />
            </span>
            {megaOpen && (
              <div className={s.mega}>
                {SERVICE_GROUPS.map((g) => (
                  <div key={g.key} className={s.megaCol}>
                    <h3>{t(g.key)}</h3>
                    <ul>
                      {g.items.map((it) => (
                        <li key={it.href + it.key}>
                          <Link href={it.href}>
                            <span className={s.megaIcon}><Icon name={it.icon} size={18} /></span>
                            <span>
                              <span className={s.megaTitle}>{t(it.key)}</span>
                              {it.desc && <span className={s.megaDesc}>{t(it.desc)}</span>}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>
          {LINKS.map((l) => (
            <li key={l.key}><Link href={l.href} className={`${s.navLink} ${isActive(l.href) ? s.active : ""}`}>{t(l.key)}</Link></li>
          ))}
        </ul>
        <button type="button" className={s.burger} aria-label={drawer ? t("nav.closeMenu") : t("nav.menu")} aria-expanded={drawer} onClick={() => setDrawer((d) => !d)}>
          <Icon name={drawer ? "close" : "menu"} />
        </button>
      </div>
      {drawer && (
        <div className={s.drawer}>
          <Link href="/">{t("nav.home")}</Link>
          {SERVICE_GROUPS.flatMap((g) => g.items).map((it) => (
            <Link key={it.href + it.key} href={it.href}>{t(it.key)}</Link>
          ))}
          {LINKS.slice(1).map((l) => <Link key={l.key} href={l.href}>{t(l.key)}</Link>)}
        </div>
      )}
    </nav>
  );
}
