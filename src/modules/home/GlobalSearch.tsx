"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { delayFor } from "@/mock/api";
import { searchSuggest, type SearchItem } from "@/mock/endpoints/search";
import { Icon } from "@/components/ui/Icon";
import s from "./GlobalSearch.module.css";

/**
 * TXT-14: typeahead. Keystrokes are debounced (SEARCH_DEBOUNCE) and then fetched (SEARCH_SUGGEST),
 * so suggestions appear ~0.9s after the last keystroke; stale responses are discarded.
 * The listbox is removed from the DOM whenever it is closed.
 */
export function GlobalSearch() {
  const { t, lang } = useT();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setItems([]); setLoading(false); return; }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      const res = await searchSuggest(query);
      if (mine !== seq.current) return;
      setItems(res);
      setActive(-1);
      setLoading(false);
    }, delayFor("SEARCH_DEBOUNCE"));
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goTo = (it: SearchItem) => { setOpen(false); router.push(it.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); goTo(items[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  const showList = open && q.trim().length >= 2;
  return (
    <section className={s.band} aria-labelledby="svc-search-title">
      <div className="container">
        <h2 id="svc-search-title" className={s.title}>{t("home.searchTitle")}</h2>
        <form className={s.form} role="search" onSubmit={(e) => { e.preventDefault(); if (items[0]) goTo(items[active >= 0 ? active : 0]); }}>
          <div className={s.field} ref={wrap}>
            <label htmlFor="service-search" className="sr-only">{t("home.searchLabel")}</label>
            <Icon name="search" className={s.icon} />
            <input
              id="service-search"
              name="q"
              type="search"
              autoComplete="off"
              className={s.input}
              placeholder={t("home.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => items.length && setOpen(true)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            />
            <kbd className={s.kbd} title={t("home.searchHint")}>/</kbd>
            {showList && (
              <ul id={listId} role="listbox" className={s.list} aria-label={t("home.searchLabel")}>
                {loading && <li className={s.status} role="presentation">{t("home.searchLoading")}</li>}
                {!loading && items.length === 0 && <li className={s.status} role="presentation">{t("home.searchNoResults")}</li>}
                {!loading && items.map((it, i) => (
                  <li
                    key={it.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`${s.option} ${i === active ? s.optionActive : ""}`}
                    onMouseDown={(e) => { e.preventDefault(); goTo(it); }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span>{pick(it, lang)}</span>
                    <span className={s.dept}>{it.dept}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="btn btn-accent">{t("home.searchButton")}</button>
        </form>
      </div>
    </section>
  );
}
