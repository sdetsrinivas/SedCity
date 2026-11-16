"use client";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { USAGES, type Usage } from "./tax";
import s from "./PropertyTax.module.css";

const LABEL: Record<Usage, DictKey> = { residential: "pt.usageResidential", commercial: "pt.usageCommercial", mixed: "pt.usageMixed" };

/**
 * RAD-03: segmented control. It looks like a row of buttons, but each segment is a real
 * `<input type="radio" name="usageType">` stretched transparently over its label, so native radio
 * semantics, labels and keyboard behaviour all work.
 */
export function UsageSegments({ value, onChange, error }: { value: Usage | null; onChange: (u: Usage) => void; error?: DictKey }) {
  const { t } = useT();
  return (
    <fieldset className={s.fieldset} aria-describedby="pt-usage-help">
      <legend className="label">{t("pt.usage")}</legend>
      <div className={`${s.segments} ${error ? s.segmentsInvalid : ""}`}>
        {USAGES.map((u) => (
          <label key={u} className={`${s.segment} ${value === u ? s.segmentOn : ""}`}>
            <input type="radio" name="usageType" value={u} checked={value === u} onChange={() => onChange(u)} className={s.segmentInput} />
            {t(LABEL[u])}
          </label>
        ))}
      </div>
      <span className="help" id="pt-usage-help">{t("pt.usageHelp")}</span>
      {error && <span className="error">{t(error)}</span>}
    </fieldset>
  );
}
