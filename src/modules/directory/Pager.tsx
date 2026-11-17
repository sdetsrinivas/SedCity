"use client";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import s from "./Directory.module.css";

/**
 * TBL-02: numbered pager. Previous/Next are natively disabled at the ends; the current page button has
 * `aria-current="page"`, and page buttons are named “Page 3” (aria-label) while showing only “3”.
 */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  const { t } = useT();
  if (pages <= 1) return null;
  return (
    <nav aria-label={t("dir.pages")}>
      <ul className={s.pager}>
        <li>
          <button type="button" className={s.pageBtn} disabled={page === 0} onClick={() => onPage(page - 1)}>
            <Icon name="chevronLeft" size={14} /> {t("dir.prev")}
          </button>
        </li>
        {Array.from({ length: pages }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className={s.pageBtn}
              aria-label={t("dir.pageN", { n: i + 1 })}
              aria-current={i === page ? "page" : undefined}
              onClick={() => i !== page && onPage(i)}
            >
              {i + 1}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={s.pageBtn} disabled={page === pages - 1} onClick={() => onPage(page + 1)}>
            {t("dir.next")} <Icon name="chevronRight" size={14} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
