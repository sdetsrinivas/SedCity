"use client";
import { useId, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { NEWS_CATEGORIES } from "@/mock/endpoints/news";
import { useNewsFilter } from "./NewsFilterContext";
import s from "./News.module.css";

const OPTIONS = ["", ...NEWS_CATEGORIES];
export const categoryKey = (c: string) => (c ? `news.cat.${c}` : "news.catAll") as DictKey;

/**
 * DRP-07: a select-only combobox (`div role=combobox`, ARIA APG pattern). Focus stays on the combobox
 * while the list is open (options are tracked with aria-activedescendant), and the list closes as soon as
 * the combobox loses focus: Tab, a click elsewhere, a script calling blur()/focus() on another element,
 * and so on. The options exist only while it is open. Mouse presses on an option are
 * prevented from taking focus, which is what lets a real click land before the blur.
 */
export function NewsCategorySelect() {
  const { t } = useT();
  const [filter, filters] = useNewsFilter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const optionId = (i: number) => `${listId}-o${i}`;

  const show = () => {
    setActive(Math.max(0, OPTIONS.indexOf(filter.category)));
    setOpen(true);
  };
  const choose = (i: number) => {
    filters.set({ category: OPTIONS[i] });
    setOpen(false);
  };
  const move = (next: number) => {
    setActive(next);
    document.getElementById(optionId(next))?.scrollIntoView?.({ block: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const last = OPTIONS.length - 1;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        if (!open) show();
        else move(Math.min(last, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1))));
        return;
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        move(e.key === "Home" ? 0 : last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else show();
        return;
      case "Escape":
        if (open) { e.preventDefault(); setOpen(false); }
        return;
    }
  };

  return (
    <div className={`field ${s.categoryField}`}>
      <span className="label" id="news-category-label">{t("news.category")}</span>
      <div className={s.combo}>
        <div
          role="combobox"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-labelledby="news-category-label"
          className={`select ${s.comboButton}`}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        >
          <span>{t(categoryKey(filter.category))}</span>
          <Icon name="chevronDown" size={18} />
        </div>
        {open && (
          <ul id={listId} role="listbox" aria-labelledby="news-category-label" className={s.listbox}>
            {OPTIONS.map((c, i) => (
              <li
                key={c || "all"}
                id={optionId(i)}
                role="option"
                aria-selected={c === filter.category}
                className={`${s.option} ${i === active ? s.optionActive : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {t(categoryKey(c))}
                {c === filter.category && <Icon name="check" size={16} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
