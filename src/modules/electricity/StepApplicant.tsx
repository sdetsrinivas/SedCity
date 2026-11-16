"use client";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { formatAstheenId, formatMobile } from "@/lib/mask";
import type { StepProps } from "./types";
import s from "./Electricity.module.css";

export function StepApplicant({ draft, set, errors }: StepProps) {
  const { t } = useT();
  const err = (k: keyof typeof errors) => errors[k] && <span className="error" id={`err-${k}`}>{t(errors[k] as DictKey)}</span>;
  return (
    <>
      <div className="field">
        <label htmlFor="el-name">{t("el.name")}</label>
        <input id="el-name" className="input" autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
        {err("name")}
      </div>
      <div className="field">
        <label htmlFor="el-astheen">{t("el.astheenId")}</label>
        {/* TXT-03: masked "ASP-XXXX-XXXX-X" — prefix, hyphens and length are enforced on every keystroke. */}
        <input id="el-astheen" className={`input ${s.mono}`} placeholder="ASP-____-____-_" value={draft.astheenId}
          onChange={(e) => set("astheenId", formatAstheenId(e.target.value))} aria-invalid={!!errors.astheenId} aria-describedby="el-astheen-help" />
        <span className="help" id="el-astheen-help">{t("el.astheenHelp")}</span>
        {err("astheenId")}
      </div>
      <div className={s.grid2}>
        <div className="field">
          <label htmlFor="el-mobile">{t("el.mobile")}</label>
          <input id="el-mobile" type="tel" className="input" inputMode="numeric" value={draft.mobile}
            onChange={(e) => set("mobile", formatMobile(e.target.value))} aria-invalid={!!errors.mobile} />
          {err("mobile")}
        </div>
        <div className="field">
          <label htmlFor="el-email">{t("el.email")}</label>
          <input id="el-email" type="email" className="input" value={draft.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>
    </>
  );
}
