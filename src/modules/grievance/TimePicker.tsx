"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { HOURS, MINUTES, formatTime, hour12, isPM, isSlotAllowed, parseValue, toValue } from "./time";
import s from "./Grievance.module.css";

/**
 * DAT-04: custom time picker. The visible field is a readonly <input> that shows a 12-hour time
 * ("02:30 PM"); the 24-hour value ("14:30") is in a hidden input named `inspectionTime`. Clicking the
 * field opens a popover with an Hour and a Minute listbox: there is no 1 PM option (lunch hour) and
 * 5:45 PM is disabled (aria-disabled) because the last slot is 5:30 PM.
 */
export function TimePicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: DictKey }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const am = t("gr.am");
  const pm = t("gr.pm");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); input.current?.focus(); }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const show = () => {
    const p = parseValue(value);
    setHour(p?.h ?? null);
    setMinute(p?.m ?? null);
    setOpen(true);
  };

  const pickHour = (h: number) => {
    setHour(h);
    if (minute !== null && isSlotAllowed(h, minute)) onChange(toValue(h, minute));
    else if (minute !== null) { setMinute(null); onChange(""); }
  };

  const pickMinute = (m: number) => {
    if (hour === null) { setMinute(m); return; }
    if (!isSlotAllowed(hour, m)) return;
    setMinute(m);
    onChange(toValue(hour, m));
    setOpen(false);
    input.current?.focus();
  };

  return (
    <div className="field" ref={wrap}>
      <label htmlFor="gr-time">{t("gr.time")}</label>
      <div className={s.timeWrap}>
        <input
          ref={input}
          id="gr-time"
          className={`input ${s.timeInput}`}
          readOnly
          value={formatTime(value, am, pm)}
          placeholder="--:-- --"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={!!error}
          aria-describedby="gr-time-help"
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); show(); }
          }}
        />
        <Icon name="clock" size={18} className={s.timeIcon} />
        <input type="hidden" name="inspectionTime" value={value} />
        {open && (
          <div className={s.timePop} role="dialog" aria-label={t("gr.timeDialog")}>
            <div className={s.timeCol}>
              <span className={s.timeHead} id="gr-time-hours">{t("gr.hour")}</span>
              <ul role="listbox" aria-labelledby="gr-time-hours" className={s.timeList}>
                {HOURS.map((h) => (
                  <li key={h} role="option" aria-selected={h === hour} className={`${s.timeOpt} ${h === hour ? s.timeOptOn : ""}`}
                    onClick={() => pickHour(h)}>
                    {hour12(h)} {isPM(h) ? pm : am}
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.timeCol}>
              <span className={s.timeHead} id="gr-time-minutes">{t("gr.minute")}</span>
              <ul role="listbox" aria-labelledby="gr-time-minutes" className={s.timeList}>
                {MINUTES.map((m) => {
                  const disabled = hour !== null && !isSlotAllowed(hour, m);
                  return (
                    <li key={m} role="option" aria-selected={m === minute} aria-disabled={disabled || undefined}
                      className={`${s.timeOpt} ${m === minute ? s.timeOptOn : ""} ${disabled ? s.timeOptOff : ""}`}
                      onClick={() => pickMinute(m)}>
                      {String(m).padStart(2, "0")}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
      <span className="help" id="gr-time-help">{t("gr.timeHelp")}</span>
      {error && <span className="error">{t(error)}</span>}
    </div>
  );
}
