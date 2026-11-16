"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { listLocalities, localityById, type Locality } from "@/mock/endpoints/property";
import s from "./PropertyTax.module.css";

/**
 * DRP-06: custom listbox whose options are lazy-loaded. Opening it fetches the first ten localities
 * (LOCALITY_PAGE, 700ms); the next ten are only requested when the list is scrolled to its end (or the
 * arrow keys reach the last option), with a "Loading more localities…" row meanwhile. Options that have
 * not been loaded are not in the DOM at all, so a locality further down the city cannot be found or
 * clicked until the list has been scrolled far enough.
 */
export function LocalitySelect({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: DictKey }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Locality[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const page = useRef(0);
  const busy = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const label = (l: Locality) => t("pt.localityOption", { name: pick(l.name, lang), no: l.wardNo });
  const selected = value ? localityById(value) : undefined;

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const res = await listLocalities(page.current);
      page.current += 1;
      setItems((old) => [...old, ...res.items]);
      setHasMore(res.hasMore);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (page.current === 0) void loadMore();
    list.current?.focus();
    if (value) {
      const id = `pt-loc-${value}`;
      document.getElementById(id)?.scrollIntoView?.({ block: "nearest" });
    }
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, loadMore]);

  const reveal = (i: number) => {
    const id = items[i]?.id;
    if (id) document.getElementById(`pt-loc-${id}`)?.scrollIntoView?.({ block: "nearest" });
  };

  const show = () => {
    setActive(Math.max(0, items.findIndex((l) => l.id === value)));
    setOpen(true);
  };

  const choose = (l: Locality) => {
    onChange(l.id);
    setOpen(false);
    button.current?.focus();
  };

  const onScroll = () => {
    const el = list.current;
    if (!el || !hasMore || failed) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) void loadMore();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
      if (e.key === "Escape") button.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const last = items.length - 1;
      const next = e.key === "Home" ? 0 : e.key === "End" ? last : Math.min(last, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      reveal(next);
      if (next >= last && hasMore && (e.key === "ArrowDown" || e.key === "End")) void loadMore();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && items[active]) {
      e.preventDefault();
      choose(items[active]);
    }
  };

  return (
    <div className="field" ref={wrap}>
      <span className="label" id="pt-locality-label">{t("pt.locality")}</span>
      <div className={s.combo}>
        <button
          ref={button}
          type="button"
          id="pt-locality"
          className={`select ${s.comboButton}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="pt-locality-list"
          aria-labelledby="pt-locality-label pt-locality"
          aria-invalid={!!error}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              show();
            }
          }}
        >
          <span className={selected ? undefined : s.placeholder}>{selected ? label(selected) : t("pt.localityChoose")}</span>
          <Icon name="chevronDown" size={18} />
        </button>
        {open && (
          <ul
            ref={list}
            id="pt-locality-list"
            role="listbox"
            tabIndex={-1}
            className={s.comboList}
            aria-labelledby="pt-locality-label"
            aria-activedescendant={items[active] ? `pt-loc-${items[active].id}` : undefined}
            aria-busy={loading}
            onScroll={onScroll}
            onKeyDown={onKey}
          >
            {items.map((l, i) => (
              <li
                key={l.id}
                id={`pt-loc-${l.id}`}
                role="option"
                aria-selected={l.id === value}
                className={`${s.comboOption} ${i === active ? s.comboActive : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(l)}
              >
                {label(l)}
              </li>
            ))}
            {loading && (
              <li role="presentation" className={s.comboLoading}>
                <span className={s.spinner} aria-hidden="true" /> {t(items.length ? "pt.localityMore" : "pt.localityLoading")}
              </li>
            )}
            {failed && (
              <li role="presentation" className={s.comboLoading}>
                {t("pt.localityFailed")}{" "}
                <button type="button" className="link-btn" onClick={() => void loadMore()}>{t("pt.retry")}</button>
              </li>
            )}
          </ul>
        )}
      </div>
      <span className="help" id="pt-locality-help">{t("pt.localityHelp")}</span>
      {error && <span className="error">{t(error)}</span>}
    </div>
  );
}
