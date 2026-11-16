"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate, parseDDMMYYYY, toISODate } from "@/lib/format";
import s from "./Electricity.module.css";

/** Auto-inserts slashes: "05112026" → "05/11/2026". */
export function maskDDMMYYYY(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

/**
 * DAT-05: the visible field shows and accepts DD/MM/YYYY (slashes auto-inserted), while the value
 * submitted is ISO in a hidden input named `inspectionDate`. A calendar popover offers the same
 * range; dates outside min..max are disabled.
 */
export function DateField({ id, label, help, value, onChange, min, max, invalid, describedBy }: {
  id: string; label: string; help: string; value: string; onChange: (iso: string) => void;
  min: string; max: string; invalid?: boolean; describedBy?: string;
}) {
  const { t, lang } = useT();
  const [text, setText] = useState(formatDate(value));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || min).slice(0, 7));
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => { if (value) setText(formatDate(value)); }, [value]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const onText = (v: string) => {
    const masked = maskDDMMYYYY(v);
    setText(masked);
    onChange(parseDDMMYYYY(masked) ?? "");
  };

  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toISODate(new Date(y, m - 1, i + 1)))];
  const shift = (n: number) => setMonth(toISODate(new Date(y, m - 1 + n, 1)).slice(0, 7));
  const monthLabel = first.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" });
  const weekdays = lang === "ta" ? ["தி", "செ", "பு", "வி", "வெ", "ச", "ஞா"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="field" ref={wrap}>
      <label htmlFor={id}>{label}</label>
      <div className={s.dateWrap}>
        <input id={id} className="input" inputMode="numeric" placeholder="DD/MM/YYYY" maxLength={10} autoComplete="off"
          value={text} onChange={(e) => onText(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy} />
        <button type="button" className={s.calBtn} aria-label={t("el.openCalendar")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Icon name="calendar" size={18} />
        </button>
        <input type="hidden" name="inspectionDate" value={value} />
        {open && (
          <div className={s.calendar} role="dialog" aria-label={monthLabel}>
            <div className={s.calHead}>
              <button type="button" className="icon-btn" aria-label={t("el.prevMonth")} disabled={month <= min.slice(0, 7)} onClick={() => shift(-1)}><Icon name="chevronLeft" size={16} /></button>
              <strong>{monthLabel}</strong>
              <button type="button" className="icon-btn" aria-label={t("el.nextMonth")} disabled={month >= max.slice(0, 7)} onClick={() => shift(1)}><Icon name="chevronRight" size={16} /></button>
            </div>
            <div className={s.calGrid}>
              {weekdays.map((w) => <span key={w} className={s.calDow}>{w}</span>)}
              {cells.map((iso, i) => iso === null ? <span key={`x${i}`} /> : (
                <button key={iso} type="button" className={`${s.calDay} ${iso === value ? s.calSel : ""}`}
                  disabled={iso < min || iso > max} aria-label={formatDate(iso)} aria-pressed={iso === value}
                  onClick={() => { onChange(iso); setText(formatDate(iso)); setOpen(false); }}>
                  {Number(iso.slice(8))}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <span className="help" id={`${id}-help`}>{help}</span>
    </div>
  );
}
