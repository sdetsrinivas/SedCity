"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { TariffModals } from "./TariffModals";
import type { StepProps } from "./types";
import s from "./Electricity.module.css";

const TYPES = [
  { v: "domestic", label: "el.domestic", hint: "el.domesticHint" },
  { v: "commercial", label: "el.commercial", hint: "el.commercialHint" },
  { v: "industrial", label: "el.industrial", hint: "el.industrialHint" },
] as const;

export function StepConnection({ draft, set, errors }: StepProps) {
  const { t } = useT();
  const [tariffOpen, setTariffOpen] = useState(false);
  const err = (k: keyof typeof errors) => errors[k] && <span className="error" id={`err-${k}`}>{t(errors[k] as DictKey)}</span>;
  return (
    <>
      {/* RAD-01: plain native radio group — name="connectionType", one <label> per input. */}
      <fieldset className={s.fieldset} aria-describedby={errors.connType ? "err-connType" : undefined}>
        <legend className={s.legend}>{t("el.connType")}</legend>
        <div className={s.radioList}>
          {TYPES.map((o) => (
            <label key={o.v} className={s.radioRow}>
              <input type="radio" name="connectionType" value={o.v} checked={draft.connType === o.v} onChange={() => set("connType", o.v)} />
              <span><strong>{t(o.label)}</strong><span className="small muted"> — {t(o.hint)}</span></span>
            </label>
          ))}
        </div>
        {err("connType")}
        <button type="button" className="link-btn small" onClick={() => setTariffOpen(true)}>{t("el.viewTariff")}</button>
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{t("el.phase")}</legend>
        <div className={s.inlineRadios}>
          {(["single", "three"] as const).map((p) => (
            <label key={p} className="check">
              <input type="radio" name="supplyPhase" value={p} checked={draft.phase === p} onChange={() => set("phase", p)} />
              {t(p === "single" ? "el.single" : "el.three")}
            </label>
          ))}
        </div>
        {err("phase")}
      </fieldset>

      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="el-load">{t("el.load")}</label>
        <input id="el-load" className="input" type="number" inputMode="decimal" min={1} max={100} step={0.5}
          value={draft.load} onChange={(e) => set("load", e.target.value)} aria-invalid={!!errors.load} aria-describedby="el-load-help" />
        <span className="help" id="el-load-help">{t("el.loadHelp")}</span>
        {err("load")}
      </div>

      <TariffModals open={tariffOpen} onClose={() => setTariffOpen(false)} type={draft.connType || "domestic"} />
    </>
  );
}
