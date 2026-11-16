"use client";
import { useT } from "@/i18n/client";
import { AGE_MAX, depreciationRate } from "./tax";
import s from "./PropertyTax.module.css";

/**
 * OTH-01: native range slider (`<input type="range" id="pt-age">`, 0–80 years, step 1) controlled by React.
 * The chosen value is echoed in an `<output>` and decides the depreciation slab.
 */
export function AgeSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useT();
  return (
    <div className="field">
      <label htmlFor="pt-age">{t("pt.age")}</label>
      <div className={s.ageRow}>
        <input
          id="pt-age"
          name="buildingAge"
          type="range"
          min={0}
          max={AGE_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={s.range}
          aria-describedby="pt-age-help"
        />
        <output htmlFor="pt-age" id="pt-age-value" className={s.ageValue}>{t("pt.ageYears", { n: value })}</output>
      </div>
      <span className="help" id="pt-age-help">{t("pt.ageHelp", { rate: Math.round(depreciationRate(value) * 100) })}</span>
    </div>
  );
}
