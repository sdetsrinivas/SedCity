"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import {
  calendarStart, dayStatus, firstAvailableDay, firstBookable, lastBookable, monthGrid, monthNav, monthOf, moveDay, shiftMonth,
  type DayStatus, type HeldSlots, type Venue,
} from "./booking";
import s from "./Bookings.module.css";

const MOVE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];
const REASON ={ outside: "bk.why.outside", closed: "bk.why.closed", full: "bk.why.full" } as const satisfies Record<DayStatus, string>;

interface Props {
  /** Generated id of the trigger button (its <label> points at it). */
  id: string;
  venue: Venue | undefined;
  value: string | null;
  onChange: (iso: string) => void;
  today: string;
  held: HeldSlots[];
  invalid?: boolean;
  describedBy?: string;
}

/**
 * DAT-02: custom calendar in a popover. The trigger is a <button> that shows the chosen day as DD/MM/YYYY;
 * the popover (div role=dialog) holds a month of <button>s laid out in div rows — no table, no grid role,
 * no input. Every week is complete, so the last days of the previous month and the first days of the
 * next month are buttons too and carry the same visible numbers ("1", "2" … twice on one screen); choosing
 * one switches the month. Days that cannot be booked are natively `disabled` (with a title saying why):
 * outside the booking window (today + 2 … today + 60), the venue's weekly closed day, or fully booked.
 * The window spans three calendar months, so later dates need the month buttons.
 *
 * Keyboard: opening focuses the chosen day or the first bookable one (one tab stop in the month); arrows
 * skip unavailable days, Home/End go to the week's first/last bookable day, PageUp/PageDown move a month,
 * Enter/Space choose, Escape closes and returns focus to the trigger. A click outside closes it.
 * DAT-02: when a month button disables itself (the window's first or last month is reached), focus moves to
 * the other month button so it stays inside the popover and Escape still closes it.
 */
export function BookingCalendar({ id, venue, value, onChange, today, held, invalid, describedBy }: Props) {
  const { t, lang } = useT();
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(firstBookable(today)));
  const [active, setActive] = useState<string | null>(null);
  const days = useRef(new Map<string, HTMLButtonElement>());
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusPending = useRef(false);
  const prevBtn = useRef<HTMLButtonElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  /** The month button to focus after a render, because the focused one has just been disabled. */
  const navFocus = useRef<HTMLButtonElement | null>(null);

  const status = (iso: string) => (venue ? dayStatus(venue, iso, today, held) : "outside");

  useEffect(() => {
    if (!open || !focusPending.current) return;
    focusPending.current = false;
    if (active) days.current.get(active)?.focus();
  }, [open, active, month]);

  useEffect(() => {
    navFocus.current?.focus();
    navFocus.current = null;
  }, [month]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // A venue change can make the open month meaningless; close the popover.
  useEffect(() => setOpen(false), [venue?.id]);

  const openCalendar = () => {
    if (!venue) return;
    const start = calendarStart(venue, today, held, value);
    setActive(start.active);
    setMonth(start.month);
    focusPending.current = true;
    setOpen(true);
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const choose = (iso: string) => {
    onChange(iso);
    close(true);
  };

  const focusDay = (iso: string) => {
    setActive(iso);
    setMonth(monthOf(iso));
    focusPending.current = true;
  };

  const onDayKey = (e: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    if (!venue || !MOVE_KEYS.includes(e.key)) return;
    e.preventDefault();
    const next = moveDay(venue, iso, e.key, today, held);
    if (next) focusDay(next);
  };

  const showMonth = (n: number) => {
    if (!venue) return;
    const target = shiftMonth(month, n);
    const can = monthNav(target, today);
    // DAT-02: the clicked button is about to be disabled; keep focus in the popover.
    if (n < 0 && !can.prev) navFocus.current = nextBtn.current;
    if (n > 0 && !can.next) navFocus.current = prevBtn.current;
    setMonth(target);
    const first = firstAvailableDay(venue, today, held, `${target}-01`);
    setActive(first && monthOf(first) === target ? first : null);
  };

  const nav = monthNav(month, today);
  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i)); // 1 Jan 2024 was a Monday
  const longDate = (iso: string) => {
    const [yy, mm, dd] = iso.split("-").map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className={s.calWrap} ref={wrap}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className={`${s.dateBtn} ${value ? "" : s.dateEmpty}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={!venue}
        onClick={() => (open ? close(false) : openCalendar())}
      >
        <span>{value ? formatDate(value) : t("bk.datePick")}</span>
        <Icon name="calendar" size={18} />
      </button>

      {open && venue && (
        <div className={s.calPop} role="dialog" aria-label={t("bk.calTitle")} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); close(true); } }}>
          <div className={s.calHead}>
            <button ref={prevBtn} type="button" className="icon-btn" aria-label={t("bk.prevMonth")} disabled={!nav.prev} onClick={() => showMonth(-1)}>
              <Icon name="chevronLeft" size={16} />
            </button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button ref={nextBtn} type="button" className="icon-btn" aria-label={t("bk.nextMonth")} disabled={!nav.next} onClick={() => showMonth(1)}>
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className={s.calWeek} aria-hidden="true">
            {weekdays.map((d) => <span key={d.getDay()}>{d.toLocaleDateString(locale, { weekday: "narrow" })}</span>)}
          </div>
          {monthGrid(month).map((week) => (
            <div key={week[0]} className={s.calWeek}>
              {week.map((iso) => {
                const why = status(iso);
                const other = monthOf(iso) !== month;
                return (
                  <button
                    key={iso}
                    ref={(el) => { if (el) days.current.set(iso, el); else days.current.delete(iso); }}
                    type="button"
                    tabIndex={iso === active ? 0 : -1}
                    disabled={!!why}
                    aria-pressed={iso === value}
                    aria-label={longDate(iso)}
                    title={why ? t(REASON[why]) : undefined}
                    className={`${s.day} ${other ? s.dayOther : ""} ${iso === value ? s.daySel : ""} ${iso === today ? s.dayToday : ""}`}
                    onClick={() => choose(iso)}
                    onKeyDown={(e) => onDayKey(e, iso)}
                  >
                    {Number(iso.slice(8))}
                  </button>
                );
              })}
            </div>
          ))}
          <p className={`small muted ${s.calNote}`}>
            {t("bk.window", { from: formatDate(firstBookable(today)), to: formatDate(lastBookable(today)) })}
          </p>
        </div>
      )}
    </div>
  );
}
