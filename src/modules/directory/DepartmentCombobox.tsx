"use client";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { DEPARTMENTS } from "@/mock/endpoints/directory";
import s from "./Directory.module.css";

interface Option {
  id: string;
  label: string;
}

/**
 * DRP-04: searchable combobox (ARIA APG "list autocomplete with automatic selection"). A native
 * `<input role=combobox>` (generated id, labelled by its `<label>`) over a `role=listbox` of 14 options that
 * exists only while open. Typing filters the options (substring, current language) and makes the first
 * match the active one, so Enter picks it; ArrowDown/ArrowUp open and move, Escape closes. The filter is
 * only applied when an option is chosen: text that was typed but not chosen is thrown away when the field
 * loses focus or Escape is pressed, and the field shows the chosen department again.
 */
export function DepartmentCombobox({ value, onChange }: { value: string; onChange: (department: string) => void }) {
  const { t, lang } = useT();
  const inputId = useId();
  const listId = `${inputId}-list`;
  const options = useMemo<Option[]>(
    () => [{ id: "", label: t("dir.allDepartments") }, ...DEPARTMENTS.map((d) => ({ id: d.id, label: pick(d, lang) }))],
    [t, lang],
  );
  const selectedLabel = options.find((o) => o.id === value)?.label ?? options[0].label;

  const [open, setOpen] = useState(false);
  /** Text typed since the list opened; null = nothing typed (all options are offered). */
  const [typed, setTyped] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const shown = useMemo(() => {
    const needle = typed?.trim().toLocaleLowerCase();
    return needle ? options.filter((o) => o.label.toLocaleLowerCase().includes(needle)) : options;
  }, [options, typed]);
  const optionId = (o: Option) => `${listId}-${o.id || "all"}`;

  const close = () => {
    setOpen(false);
    setTyped(null);
    setActive(-1);
  };
  const showAll = () => {
    setTyped(null);
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    setOpen(true);
  };
  const choose = (o: Option) => {
    close();
    if (o.id !== value) onChange(o.id);
  };
  const move = (next: number) => {
    setActive(next);
    const o = shown[next];
    if (o) document.getElementById(optionId(o))?.scrollIntoView?.({ block: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) return showAll();
        if (!shown.length) return;
        const step = e.key === "ArrowDown" ? 1 : -1;
        move(active < 0 ? 0 : (active + step + shown.length) % shown.length);
        return;
      }
      case "Enter":
        if (!open) return;
        e.preventDefault();
        if (shown[active]) choose(shown[active]);
        return;
      case "Escape":
        if (!open && typed === null) return;
        e.preventDefault();
        close();
        return;
    }
  };

  const listOpen = open && shown.length > 0;
  const activeOption = listOpen ? shown[active] : undefined;

  return (
    <div className={`field ${s.deptField}`}>
      <label htmlFor={inputId}>{t("dir.department")}</label>
      <div className={s.combo}>
        <input
          id={inputId}
          className={`input ${s.comboInput}`}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
          value={typed ?? selectedLabel}
          onChange={(e) => {
            const text = e.target.value;
            setTyped(text);
            setOpen(true);
            setActive(0);
          }}
          onClick={(e) => {
            if (open) return close();
            e.currentTarget.select();
            showAll();
          }}
          onKeyDown={onKeyDown}
          onBlur={close}
        />
        <Icon name="chevronDown" size={18} className={s.comboChevron} />
        {listOpen && (
          <ul id={listId} role="listbox" aria-label={t("dir.department")} className={s.listbox}>
            {shown.map((o, i) => (
              <li
                key={o.id || "all"}
                id={optionId(o)}
                role="option"
                aria-selected={o.id === value}
                className={`${s.option} ${i === active ? s.optionActive : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                {o.label}
                {o.id === value && <Icon name="check" size={16} />}
              </li>
            ))}
          </ul>
        )}
        {open && typed !== null && shown.length === 0 && (
          <p className={s.noMatch} role="status">{t("dir.noDepartment", { text: typed.trim() })}</p>
        )}
      </div>
    </div>
  );
}
