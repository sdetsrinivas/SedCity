"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { addDays, formatDate } from "@/lib/format";
import {
  clampToWindow, firstAvailable, monthOf, monthWeeks, moveDate, shiftMonth, unavailableReason, WINDOW_DAYS, type Unavailable,
} from "./tracking";
import s from "./Track.module.css";

/**
 * DAT-06: inline calendar for a new inspection date. It is a `table[role=grid]` whose day cells are
 * `td[role=gridcell]` (no buttons). Sundays, 2nd/4th Saturdays, public holidays, fully booked days and
 * days outside tomorrow…+30 look greyed out and carry `aria-disabled=true`, but they are ordinary cells:
 * nothing is natively disabled, a click on them only shows why that day is unavailable (also for days
 * outside the window, which the roving focus never reaches). The choice is also in hidden input
 * `inspectionDate` (ISO).
 *
 * Keyboard: the grid has one tab stop (roving tabindex), focused as soon as the calendar opens; arrows,
 * Home/End and PageUp/PageDown move, Enter/Space choose.
 */
export function InspectionCalendar({ value, onChange, today }: { value: string | null; onChange: (iso: string) => void; today: string }) {
  const { t, lang } = useT();
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const [active, setActive] = useState(() => value ?? firstAvailable(addDays(today, 1), today) ?? addDays(today, 1));
  const [month, setMonth] = useState(() => monthOf(active));
  /** The day the note below the grid talks about: the one last clicked or moved to (not clamped). */
  const [noted, setNoted] = useState<string | null>(null);
  const cells = useRef(new Map<string, HTMLTableCellElement>());
  const focusActive = useRef(true);
  // Bumped on every keyboard move, so focus follows even when the active day itself does not change.
  const [focusTick, setFocusTick] = useState(0);
  const labelId = useId();

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    cells.current.get(active)?.focus();
  }, [active, month, focusTick]);

  const minMonth = monthOf(addDays(today, 1));
  const maxMonth = monthOf(addDays(today, WINDOW_DAYS));
  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i)); // 1 Jan 2024 was a Monday

  const reasonText = (r: Unavailable) => {
    switch (r.kind) {
      case "outside": return t("gt.why.outside");
      case "sunday": return t("gt.why.sunday");
      case "saturday": return t(r.nth === 2 ? "gt.why.saturday2" : "gt.why.saturday4");
      case "holiday": return t("gt.why.holiday", { name: pick(r.holiday, lang) });
      case "full": return t("gt.why.full");
    }
  };

  const go = (iso: string, focus: boolean) => {
    const next = clampToWindow(iso, today);
    focusActive.current = focus;
    if (focus) setFocusTick((n) => n + 1);
    setActive(next);
    setMonth(monthOf(next));
    return next;
  };

  const choose = (iso: string) => {
    setNoted(iso);
    const why = unavailableReason(iso, today);
    // Focus only follows clicks inside the window; a day outside it just gets its explanation.
    if (why?.kind !== "outside") go(iso, false);
    if (!why) onChange(iso);
  };

  const onKey = (e: KeyboardEvent<HTMLTableCellElement>, iso: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(iso);
      return;
    }
    const next = moveDate(iso, e.key);
    if (!next) return;
    e.preventDefault();
    setNoted(go(next, true));
  };

  const shift = (n: number) => {
    const target = shiftMonth(month, n);
    setMonth(target);
    setActive(clampToWindow(`${target}-${active.slice(8)}`.replace(/-(29|30|31)$/, "-28"), today));
  };

  const notedReason = noted ? unavailableReason(noted, today) : null;
  return (
    <div className={s.calendar}>
      <div className={s.calHead}>
        <button type="button" className="icon-btn" aria-label={t("gt.prevMonth")} disabled={month <= minMonth} onClick={() => shift(-1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <strong id={labelId} aria-live="polite">{monthLabel}</strong>
        <button type="button" className="icon-btn" aria-label={t("gt.nextMonth")} disabled={month >= maxMonth} onClick={() => shift(1)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
      <table role="grid" aria-labelledby={labelId} className={s.grid}>
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th key={d.getDay()} scope="col" abbr={d.toLocaleDateString(locale, { weekday: "long" })}>
                {d.toLocaleDateString(locale, { weekday: "narrow" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthWeeks(month).map((week, w) => (
            <tr key={w}>
              {week.map((iso, i) => {
                if (!iso) return <td key={`x${i}`} />;
                const why = unavailableReason(iso, today);
                const [yy, mm, dd] = iso.split("-").map(Number);
                return (
                  <td
                    key={iso}
                    ref={(el) => { if (el) cells.current.set(iso, el); else cells.current.delete(iso); }}
                    role="gridcell"
                    tabIndex={iso === active ? 0 : -1}
                    aria-selected={iso === value}
                    aria-disabled={why ? true : undefined}
                    aria-label={new Date(yy, mm - 1, dd).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    title={why ? reasonText(why) : undefined}
                    className={`${s.day} ${why ? s.dayOff : ""} ${iso === value ? s.daySel : ""} ${iso === today ? s.dayToday : ""}`}
                    onClick={() => choose(iso)}
                    onKeyDown={(e) => onKey(e, iso)}
                  >
                    {dd}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`small ${s.dayNote}`} aria-live="polite">
        {noted && (notedReason
          ? t("gt.dayUnavailable", { date: formatDate(noted), reason: reasonText(notedReason) })
          : t("gt.dayAvailable", { date: formatDate(noted) }))}
      </p>
      <input type="hidden" name="inspectionDate" value={value ?? ""} />
    </div>
  );
}
