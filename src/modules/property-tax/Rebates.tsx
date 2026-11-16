"use client";
import type { KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { REBATES, REBATE_RATE, type Rebate } from "./tax";
import s from "./PropertyTax.module.css";

const TEXT: Record<Rebate, { label: DictKey; note: DictKey }> = {
  senior: { label: "pt.rebateSenior", note: "pt.rebateSeniorNote" },
  rainwater: { label: "pt.rebateRain", note: "pt.rebateRainNote" },
  solar: { label: "pt.rebateSolar", note: "pt.rebateSolarNote" },
};

/**
 * CHK-03: rebates are `div role="checkbox"` elements with `aria-checked`, focusable with tabindex=0 and
 * toggled by click or Space. There is no `<input>`, so `isSelected()` / `:checked` never reflect the state.
 */
export function Rebates({ value, onChange }: { value: Rebate[]; onChange: (r: Rebate[]) => void }) {
  const { t } = useT();
  const toggle = (r: Rebate) => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r]);
  const onKey = (e: KeyboardEvent, r: Rebate) => {
    if (e.key === " ") {
      e.preventDefault();
      toggle(r);
    }
  };
  return (
    <div role="group" aria-labelledby="pt-rebates-title" className={s.rebates}>
      {REBATES.map((r) => {
        const on = value.includes(r);
        return (
          <div
            key={r}
            role="checkbox"
            aria-checked={on}
            tabIndex={0}
            aria-labelledby={`pt-rebate-${r}`}
            aria-describedby={`pt-rebate-${r}-note`}
            className={`${s.rebate} ${on ? s.rebateOn : ""}`}
            onClick={() => toggle(r)}
            onKeyDown={(e) => onKey(e, r)}
          >
            <span className={s.box} aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
            <span className={s.rebateText}>
              <span id={`pt-rebate-${r}`} className={s.rebateLabel}>{t(TEXT[r].label)}</span>
              <span id={`pt-rebate-${r}-note`} className="small muted">{t(TEXT[r].note, { p: Math.round(REBATE_RATE[r] * 100) })}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
