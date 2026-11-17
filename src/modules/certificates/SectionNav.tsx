"use client";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import s from "./Certificates.module.css";

export const TRADE_SECTIONS: { id: string; nav: DictKey }[] = [
  { id: "tl-sec-1", nav: "tl.nav1" },
  { id: "tl-sec-2", nav: "tl.nav2" },
  { id: "tl-sec-3", nav: "tl.nav3" },
  { id: "tl-sec-4", nav: "tl.nav4" },
  { id: "tl-sec-5", nav: "tl.nav5" },
  { id: "tl-sec-6", nav: "tl.nav6" },
];

/**
 * DYN-09: in-page links to the six sections, `position: sticky` just below the (also sticky) site
 * header. Together they cover a band at the top of the viewport. The sections themselves have
 * `scroll-margin-top`, so these links land correctly; the fields inside them do not.
 */
export function SectionNav() {
  const { t } = useT();
  return (
    <nav className={s.sectionNav} aria-label={t("tl.sections")}>
      <ol>
        {TRADE_SECTIONS.map((sec, i) => (
          <li key={sec.id}><a href={`#${sec.id}`}><span className={s.navNo}>{i + 1}</span>{t(sec.nav)}</a></li>
        ))}
      </ol>
    </nav>
  );
}
