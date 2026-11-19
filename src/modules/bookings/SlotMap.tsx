"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { MAX_SLOTS, SLOT_HOURS, hhmm, slotLabel, toggleSlot } from "./booking";
import s from "./Bookings.module.css";

const CELL = 100;
const PAD = 32;
const TOP = 14;
const H = 60;

interface Props {
  /** Generated id used for the hatch pattern and the label. */
  uid: string;
  dateLabel: string;
  slots: number[];
  taken: number[];
  value: number[];
  onChange: (slots: number[]) => void;
  invalid?: boolean;
}

/**
 * OTH-21: the day's two-hour slots drawn as an SVG timeline. Each slot is a `<rect role=checkbox>` with
 * `aria-checked`; its name comes only from a child `<title>` ("08:00 – 10:00, available"). The visible
 * times are separate `<text>` ticks on the axis below, between the slots, so clicking a time label hits
 * nothing. Booked slots are filled with a hatch `<pattern>` whose id is generated, and carry
 * `aria-disabled=true`, but SVG has no disabled state: a click on one only explains that it is booked.
 * One booking is a run of consecutive slots (at most MAX_SLOTS): a slot next to the run extends it, an end
 * of the run removes it, any other slot starts again. The parent re-mounts the map (a new <svg>) every
 * time availability is loaded.
 */
export function SlotMap({ uid, dateLabel, slots, taken, value, onChange, invalid }: Props) {
  const { t } = useT();
  const [note, setNote] = useState<string | null>(null);
  const hatch = `${uid}h`;
  const width = PAD * 2 + slots.length * CELL;

  const toggle = (hour: number) => {
    const out = toggleSlot(value, hour, taken);
    if (out.note === "taken") setNote(t("bk.slotTaken", { slot: slotLabel(hour) }));
    else if (out.note === "max") setNote(t("bk.slotMax", { hours: MAX_SLOTS * SLOT_HOURS }));
    else setNote(null);
    if (out.selected !== value) onChange(out.selected);
  };

  const run = [...value].sort((a, b) => a - b);
  const summary = run.length
    ? t("bk.slotsChosen", { from: hhmm(run[0]), to: hhmm(run[run.length - 1] + SLOT_HOURS), hours: run.length * SLOT_HOURS })
    : t("bk.slotsNone");

  return (
    <div>
      <div className={`${s.slotScroll} ${invalid ? s.slotInvalid : ""}`}>
        <svg viewBox={`0 0 ${width} ${TOP + H + 34}`} className={s.slotSvg} role="group" aria-label={t("bk.slotMapName", { date: dateLabel })}>
          <defs>
            <pattern id={hatch} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" className={s.hatchBg} />
              <line x1="0" y1="0" x2="0" y2="8" className={s.hatchLine} />
            </pattern>
          </defs>
          <line x1={PAD} x2={width - PAD} y1={TOP + H + 8} y2={TOP + H + 8} className={s.axis} />
          {slots.map((h, i) => {
            const isTaken = taken.includes(h);
            const on = value.includes(h);
            const x = PAD + i * CELL;
            return (
              <g key={h}>
                <rect
                  x={x + 3} y={TOP} width={CELL - 6} height={H} rx="6"
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={isTaken || undefined}
                  tabIndex={0}
                  className={`${s.slot} ${on ? s.slotOn : ""} ${isTaken ? s.slotTaken : ""}`}
                  fill={isTaken ? `url(#${hatch})` : undefined}
                  onClick={() => toggle(h)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(h); }
                  }}
                >
                  <title>{`${slotLabel(h)}, ${t(isTaken ? "bk.slotStateTaken" : "bk.slotStateFree")}`}</title>
                </rect>
                {(isTaken || on) && (
                  <text x={x + CELL / 2} y={TOP + H / 2 + 5} className={`${s.slotWord} ${on ? s.slotWordOn : ""}`} aria-hidden="true">
                    {t(isTaken ? "bk.slotWordTaken" : "bk.slotWordOn")}
                  </text>
                )}
                <line x1={x} x2={x} y1={TOP + H + 4} y2={TOP + H + 12} className={s.axis} />
                <text x={x} y={TOP + H + 28} className={s.tick} aria-hidden="true">{hhmm(h)}</text>
              </g>
            );
          })}
          <line x1={width - PAD} x2={width - PAD} y1={TOP + H + 4} y2={TOP + H + 12} className={s.axis} />
          <text x={width - PAD} y={TOP + H + 28} className={s.tick} aria-hidden="true">{hhmm(slots[slots.length - 1] + SLOT_HOURS)}</text>
        </svg>
      </div>
      <p className={`small ${s.slotNote} ${note ? s.slotNoteWarn : ""}`} aria-live="polite">{note ?? summary}</p>
    </div>
  );
}
