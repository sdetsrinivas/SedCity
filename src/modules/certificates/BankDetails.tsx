"use client";
import type { ClipboardEvent, DragEvent } from "react";
import { useT } from "@/i18n/client";
import type { TradeDraft, TradeField } from "./trade";
import s from "./Certificates.module.css";

interface Props {
  draft: TradeDraft;
  set: <K extends keyof TradeDraft>(k: K, v: TradeDraft[K]) => void;
  error: (k: TradeField) => string | undefined;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 18);
const block = (e: ClipboardEvent | DragEvent) => e.preventDefault();

/** Section 5: the account the licence fee is refunded to if the application is rejected. */
export function BankDetails({ draft, set, error }: Props) {
  const { t } = useT();
  const err = (k: TradeField) => {
    const m = error(k);
    return m ? <span className="error" id={`tl-${k}-error`}>{m}</span> : null;
  };
  return (
    <>
      <p className="small muted">{t("tl.bankIntro")}</p>
      <div className="field">
        <label htmlFor="tl-holder">{t("tl.holder")}</label>
        <input id="tl-holder" name="holder" className={`input ${s.wide}`} autoComplete="off" value={draft.holder}
          aria-invalid={!!error("holder")} onChange={(e) => set("holder", e.target.value)} />
        {err("holder")}
      </div>
      <div className={s.pair}>
        <div className="field">
          <label htmlFor="tl-account">{t("tl.account")}</label>
          <input id="tl-account" name="account" className="input" inputMode="numeric" autoComplete="off" maxLength={18}
            value={draft.account} aria-invalid={!!error("account")} onChange={(e) => set("account", digits(e.target.value))} />
          {err("account")}
        </div>
        {/* TXT-09: paste (and drop) is cancelled on the confirmation field, so its value can only be typed. */}
        <div className="field">
          <label htmlFor="tl-account2">{t("tl.account2")}</label>
          <input id="tl-account2" name="account2" className="input" inputMode="numeric" autoComplete="off" maxLength={18}
            value={draft.account2} aria-invalid={!!error("account2")}
            onPaste={block} onDrop={block} onChange={(e) => set("account2", digits(e.target.value))} />
          {err("account2")}
        </div>
      </div>
      <div className="field">
        <label htmlFor="tl-ifsc">{t("tl.ifsc")}</label>
        <input id="tl-ifsc" name="ifsc" className={`input ${s.short}`} autoComplete="off" maxLength={11} value={draft.ifsc}
          aria-invalid={!!error("ifsc")} aria-describedby="tl-ifsc-help"
          onChange={(e) => set("ifsc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))} />
        <span className="help" id="tl-ifsc-help">{t("tl.ifscHelp")}</span>
        {err("ifsc")}
      </div>
    </>
  );
}
