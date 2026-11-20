"use client";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { wardShort } from "./queue";
import s from "./Officer.module.css";

export interface WardOption { id: string; en: string; ta: string; open: number }

/**
 * DRP-05: multi-select with chips. A text input (`role=combobox`) sits after a list of chips, one per
 * chosen ward. The chip shows only "Ward 14" while the option reads "Ward 14 – Kalaivani Nagar" with
 * the number of open grievances after it; each chip has its own remove button ("Remove Ward 14 –
 * Kalaivani Nagar"). The `role=listbox` (`aria-multiselectable`) exists only while open and stays open
 * after a choice: a click or Enter toggles an option (`aria-selected`), typing filters, Backspace in the
 * empty input removes the last chip, Escape or leaving the field closes it. No wards chosen = all wards.
 */
export function WardPicker({ options, value, onChange, allLabel }: {
  options: WardOption[];
  value: string[];
  onChange: (wards: string[]) => void;
  allLabel: string;
}) {
  const { t, lang } = useT();
  const id = useId();
  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);

  const shown = useMemo(() => {
    const needle = text.trim().toLocaleLowerCase();
    return needle ? options.filter((o) => pick(o, lang).toLocaleLowerCase().includes(needle)) : options;
  }, [options, text, lang]);
  const chosen = value.map((v) => options.find((o) => o.id === v)).filter((o): o is WardOption => !!o);
  const optionId = (o: WardOption) => `${listId}-${o.id}`;

  const toggle = (o: WardOption) => {
    onChange(value.includes(o.id) ? value.filter((v) => v !== o.id) : [...value, o.id].sort());
    setText("");
  };
  const close = () => {
    setOpen(false);
    setText("");
    setActive(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (!shown.length) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
      setActive(next);
      document.getElementById(optionId(shown[next]))?.scrollIntoView?.({ block: "nearest" });
    } else if (e.key === "Enter") {
      if (!open || !shown[active]) return;
      e.preventDefault();
      toggle(shown[active]);
    } else if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      close();
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const listOpen = open && shown.length > 0;
  return (
    <div className={`field ${s.wardField}`}>
      <label id={labelId} htmlFor={`${id}-input`}>{t("oq.wards")}</label>
      <div className={s.chipBox} onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); input.current?.focus(); setOpen(true); } }}>
        {chosen.length > 0 && (
          <ul className={s.chips} aria-label={t("oq.selectedWards")}>
            {chosen.map((o) => (
              <li key={o.id} className={s.chip}>
                <span>{wardShort(pick(o, lang))}</span>
                <button
                  type="button"
                  className={s.chipRemove}
                  aria-label={t("oq.removeWard", { ward: pick(o, lang) })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(value.filter((v) => v !== o.id))}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={input}
          id={`${id}-input`}
          className={s.chipInput}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen && shown[active] ? optionId(shown[active]) : undefined}
          placeholder={chosen.length ? "" : allLabel}
          value={text}
          onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={close}
        />
        <Icon name="chevronDown" size={18} className={s.chipChevron} />
        {listOpen && (
          <ul id={listId} role="listbox" aria-multiselectable="true" aria-labelledby={labelId} className={s.wardList}>
            {shown.map((o, i) => {
              const on = value.includes(o.id);
              return (
                <li
                  key={o.id}
                  id={optionId(o)}
                  role="option"
                  aria-selected={on}
                  className={`${s.wardOption} ${i === active ? s.wardActive : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => toggle(o)}
                >
                  <span className={`${s.tick} ${on ? s.tickOn : ""}`} aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
                  <span className={s.wardName}>{pick(o, lang)}</span>
                  <span className="small muted">{t("oq.wardOpen", { n: o.open })}</span>
                </li>
              );
            })}
          </ul>
        )}
        {open && text.trim() !== "" && shown.length === 0 && <p className={s.noMatch} role="status">{t("oq.noWard", { text: text.trim() })}</p>}
      </div>
      {chosen.length > 0 && (
        <button type="button" className={`link-btn small ${s.clearWards}`} onClick={() => onChange([])}>{t("oq.clearWards")}</button>
      )}
    </div>
  );
}
