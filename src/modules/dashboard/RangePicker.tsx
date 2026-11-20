"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import { earliestDay, lastDayOf, monthOf, pickDay, presetRange, shiftMonth, type Range } from "./data";
import s from "./Dashboard.module.css";

const PRESETS = [3, 6, 12] as const;

/** Days of `month` laid out Monday-first, with nulls before the 1st. */
function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T12:00:00`);
  const lead = (first.getDay() + 6) % 7;
  const days = Number(lastDayOf(month).slice(8));
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
}

/**
 * DAT-03: the payment period. The trigger is a button showing “01/12/2025 – 20/11/2026” (no input to
 * type into). It opens a one-month calendar: the first day clicked starts the range, the second (on or
 * after it) ends it, an earlier day starts again. Only Apply changes the period; Cancel, Escape or a click
 * outside keep the old one. The quick choices (last 3 / 6 / 12 months) apply at once. Days after today
 * and more than 23 months back are disabled; the calendar opens on the month the period ends in.
 */
export function RangePicker({ value, today, onChange }: { value: Range; today: string; onChange: (r: Range) => void }) {
  const { t, lang } = useT();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>(value);
  const [month, setMonth] = useState(monthOf(value.to));
  const [hover, setHover] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const min = earliestDay(today);

  const show = () => { setDraft(value); setMonth(monthOf(value.to)); setHover(null); setOpen(true); };
  const close = (focus = true) => { setOpen(false); if (focus) trigger.current?.focus(); };
  const apply = (r: Range) => { onChange(r); close(); };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);

  const end = draft.to ?? (draft.from && hover && hover >= draft.from ? hover : null);
  const inSel = (d: string) => !!draft.from && !!end && d >= draft.from && d <= end;
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
  const full = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2026, 0, 5 + i)));

  return (
    <div className={s.range} ref={box} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); close(); } }}>
      <span id={`${uid}l`} className={s.rangeLabel}>{t("dash.range.label")}</span>
      <button
        ref={trigger}
        id={`${uid}b`}
        type="button"
        className={s.rangeBtn}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${uid}l ${uid}b`}
        onClick={() => (open ? close() : show())}
      >
        <Icon name="calendar" size={16} /> {formatDate(value.from)} – {formatDate(value.to)}
      </button>
      {open && (
        <div className={s.rangePop} role="dialog" aria-label={t("dash.range.dialog")}>
          <div className={s.presets}>
            {PRESETS.map((n) => (
              <button key={n} type="button" className="btn btn-outline" onClick={() => apply(presetRange(today, n))}>{t("dash.range.lastN", { n })}</button>
            ))}
          </div>
          <div className={s.calHead}>
            <button type="button" className="icon-btn" aria-label={t("dash.range.prev")} disabled={month <= monthOf(min)} onClick={() => setMonth(shiftMonth(month, 1))}>
              <Icon name="chevronLeft" size={16} />
            </button>
            <strong aria-live="polite">{title}</strong>
            <button type="button" className="icon-btn" aria-label={t("dash.range.next")} disabled={month >= monthOf(today)} onClick={() => setMonth(shiftMonth(month, -1))}>
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className={s.cal} onPointerLeave={() => setHover(null)}>
            {weekdays.map((w, i) => <span key={i} className={s.calDow} aria-hidden="true">{w}</span>)}
            {monthCells(month).map((d, i) => d === null ? <span key={i} /> : (
              <button
                key={d}
                type="button"
                className={`${s.calDay} ${inSel(d) ? s.calIn : ""} ${d === draft.from || d === draft.to ? s.calEnd : ""}`}
                aria-label={full.format(new Date(`${d}T12:00:00`))}
                aria-pressed={d === draft.from || d === draft.to}
                disabled={d > today || d < min}
                onPointerEnter={() => setHover(d)}
                onClick={() => setDraft(pickDay(draft, d))}
              >
                {Number(d.slice(8))}
              </button>
            ))}
          </div>
          <p className="small muted" aria-live="polite">
            {draft.from ? t("dash.range.chosen", { from: formatDate(draft.from), to: draft.to ? formatDate(draft.to) : "—" }) : t("dash.range.pickStart")}
          </p>
          <div className={s.calFoot}>
            <button type="button" className="btn btn-ghost" onClick={() => close()}>{t("dash.range.cancel")}</button>
            <button type="button" className="btn btn-primary" disabled={!draft.from || !draft.to} onClick={() => apply({ from: draft.from!, to: draft.to! })}>
              {t("dash.range.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
