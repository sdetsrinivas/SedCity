"use client";
import { useRef, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import type { DictKey } from "@/i18n";
import { PAY_METHODS, type PayMethod } from "./payment";
import s from "./Payment.module.css";

const LABELS: Record<PayMethod, { title: DictKey; note: DictKey; icon: "card" | "phone" | "bank" }> = {
  card: { title: "wt.mCard", note: "wt.mCardNote", icon: "card" },
  upi: { title: "wt.mUpi", note: "wt.mUpiNote", icon: "phone" },
  netbanking: { title: "wt.mNet", note: "wt.mNetNote", icon: "bank" },
};

/**
 * RAD-02: payment methods as clickable cards (`div role="radio"` inside `role="radiogroup"`), no native
 * radios. Roving tabindex: only the selected card (or the first one when none is selected) has tabindex=0;
 * arrow keys move focus and select, Space selects.
 */
export function MethodCards({ value, onChange, invalid }: { value: PayMethod | null; onChange: (m: PayMethod) => void; invalid: boolean }) {
  const { t } = useT();
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const focusable = value ?? PAY_METHODS[0];

  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (delta) {
      e.preventDefault();
      const next = (i + delta + PAY_METHODS.length) % PAY_METHODS.length;
      onChange(PAY_METHODS[next]);
      refs.current[next]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(PAY_METHODS[i]);
    }
  };

  return (
    <div className={`field ${s.methods}`}>
      <span className="label" id="wt-method-label">{t("wt.methodTitle")}</span>
      <div
        role="radiogroup"
        aria-labelledby="wt-method-label"
        aria-invalid={invalid}
        aria-describedby={invalid ? "wt-method-err" : undefined}
        className={s.methodGrid}
      >
        {PAY_METHODS.map((m, i) => {
          const checked = value === m;
          return (
            <div
              key={m}
              ref={(el) => { refs.current[i] = el; }}
              role="radio"
              aria-checked={checked}
              tabIndex={m === focusable ? 0 : -1}
              className={`${s.method} ${checked ? s.methodOn : ""}`}
              onClick={() => onChange(m)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <Icon name={LABELS[m].icon} size={22} />
              <span className={s.methodText}>
                <span className={s.methodTitle}>{t(LABELS[m].title)}</span>
                <span className={s.methodNote}>{t(LABELS[m].note)}</span>
              </span>
              <span className={s.methodDot} aria-hidden="true" />
            </div>
          );
        })}
      </div>
      {invalid && <span className="error" id="wt-method-err">{t("wt.errMethod")}</span>}
    </div>
  );
}
