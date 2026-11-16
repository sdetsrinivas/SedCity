"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { CATEGORIES, categoryById } from "@/mock/endpoints/grievance";
import s from "./Grievance.module.css";

/**
 * DRP-03: custom listbox rendered through a React portal as the last child of <body>, far away from the
 * form in the DOM. Its id and its options' ids come from useId(), and it exists only while open. It is
 * positioned absolutely under the trigger button, so it looks attached to the field.
 */
export function CategorySelect({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: DictKey }) {
  const { t, lang } = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = value ? categoryById(value) : undefined;
  const optionId = (i: number) => `${listId}-${i}`;

  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    const onDoc = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!button.current?.contains(n) && !list.current?.contains(n)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const show = () => {
    setActive(Math.max(0, CATEGORIES.findIndex((c) => c.id === value)));
    setOpen(true);
  };

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    button.current?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); button.current?.focus(); return; }
    if (e.key === "Tab") { setOpen(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const last = CATEGORIES.length - 1;
      const next = e.key === "Home" ? 0 : e.key === "End" ? last : Math.min(last, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView?.({ block: "nearest" });
      return;
    }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(CATEGORIES[active].id); }
  };

  return (
    <div className="field">
      <span className="label" id="gr-category-label">{t("gr.category")}</span>
      <button
        ref={button}
        type="button"
        id="gr-category"
        className={`select ${s.comboButton}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby="gr-category-label gr-category"
        aria-invalid={!!error}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); show(); }
        }}
      >
        <span className={selected ? undefined : s.placeholder}>{selected ? pick(selected, lang) : t("gr.categoryChoose")}</span>
        <Icon name="chevronDown" size={18} />
      </button>
      {error && <span className="error">{t(error)}</span>}
      {open && pos && createPortal(
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby="gr-category-label"
          aria-activedescendant={optionId(active)}
          className={s.portalList}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          onKeyDown={onKey}
        >
          {CATEGORIES.map((c, i) => (
            <li
              key={c.id}
              id={optionId(i)}
              role="option"
              aria-selected={c.id === value}
              className={`${s.option} ${i === active ? s.optionActive : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(c.id)}
            >
              {pick(c, lang)}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
