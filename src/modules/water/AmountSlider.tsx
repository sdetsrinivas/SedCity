"use client";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { ratioOf, stepValue, valueAtRatio, type PayBounds } from "./payment";
import s from "./Payment.module.css";

/**
 * OTH-02: custom partial-payment slider. A `div role="slider"` with a thumb drawn in CSS; there is no
 * <input type="range"> to fill. Pointer drags on the track snap to ₹10 steps (the far end snaps to the
 * exact bill total), and the keyboard works with arrows (₹10), PageUp/PageDown (₹100), Home and End.
 */
export function AmountSlider({ value, bounds, onChange }: { value: number; bounds: PayBounds; onChange: (v: number) => void }) {
  const { t } = useT();
  const track = useRef<HTMLDivElement>(null);
  const pct = `${ratioOf(value, bounds) * 100}%`;

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    onChange(valueAtRatio((e.clientX - r.left) / r.width, bounds));
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    let next: number | null = null;
    if (e.key in moves) next = stepValue(value, moves[e.key], bounds);
    else if (e.key === "Home") next = bounds.min;
    else if (e.key === "End") next = bounds.max;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div className={s.slider}>
      <div
        ref={track}
        className={s.track}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          (e.currentTarget.querySelector("[role=slider]") as HTMLElement | null)?.focus();
          fromPointer(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
      >
        <div className={s.fill} style={{ width: pct }} />
        <div
          className={s.thumb}
          style={{ left: pct }}
          role="slider"
          tabIndex={0}
          aria-labelledby="wt-amount-label"
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          aria-valuenow={value}
          aria-valuetext={formatINR(value)}
          onKeyDown={onKey}
        />
      </div>
      <div className={s.scale} aria-hidden="true">
        <span>{formatINR(bounds.min)}</span>
        <span>{t("wt.fullAmount")}</span>
      </div>
    </div>
  );
}
