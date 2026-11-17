"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { TRADE_GROUPS } from "@/mock/endpoints/certificates";
import { AREA_MAX, AREA_MIN, BUSINESS_NAME_MAX, type TradeDraft, type TradeField } from "./trade";
import s from "./Certificates.module.css";

interface Props {
  draft: TradeDraft;
  set: <K extends keyof TradeDraft>(k: K, v: TradeDraft[K]) => void;
  error: (k: TradeField) => string | undefined;
}

/** Section 1 of the trade licence application: the business name, category and floor area. */
export function BusinessDetails({ draft, set, error }: Props) {
  const { t, lang } = useT();
  const err = (k: TradeField) => {
    const m = error(k);
    return m ? <span className="error" id={`tl-${k}-error`}>{m}</span> : null;
  };
  return (
    <>
      <div className="field">
        <label htmlFor="tl-business">{t("tl.businessName")}</label>
        <input id="tl-business" name="businessName" className={`input ${s.wide}`} autoComplete="organization" maxLength={BUSINESS_NAME_MAX}
          value={draft.businessName} aria-invalid={!!error("businessName")} aria-describedby="tl-business-help"
          onChange={(e) => set("businessName", e.target.value)} />
        <span className="help" id="tl-business-help">{t("tl.businessNameHelp")}</span>
        {err("businessName")}
      </div>

      {/* DRP-02: native <select> with <optgroup>s. Group labels cannot be chosen, and every group ends with an option called "Others". */}
      <div className="field">
        <label htmlFor="tl-category">{t("tl.category")}</label>
        <select id="tl-category" name="category" className={`select ${s.wide}`} value={draft.category}
          aria-invalid={!!error("category")} aria-describedby="tl-category-help" onChange={(e) => set("category", e.target.value)}>
          <option value="">{t("tl.categoryChoose")}</option>
          {TRADE_GROUPS.map((g) => (
            <optgroup key={g.id} label={pick(g, lang)}>
              {g.categories.map((c) => <option key={c.id} value={c.id}>{pick(c, lang)}</option>)}
            </optgroup>
          ))}
        </select>
        <span className="help" id="tl-category-help">{t("tl.categoryHelp")}</span>
        {err("category")}
      </div>

      <div className="field">
        <label htmlFor="tl-area">{t("tl.area")}</label>
        <input id="tl-area" name="area" type="number" className={`input ${s.short}`} min={AREA_MIN} max={AREA_MAX} step={1}
          value={draft.area} aria-invalid={!!error("area")} aria-describedby="tl-area-help" onChange={(e) => set("area", e.target.value)} />
        <span className="help" id="tl-area-help">{t("tl.areaHelp")}</span>
        {err("area")}
      </div>
    </>
  );
}
