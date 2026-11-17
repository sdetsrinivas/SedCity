"use client";
import type { FormEvent } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { BIRTH_FEES } from "@/mock/endpoints/certificates";
import { COPIES_MAX, COPIES_MIN, DELIVERY_MODES, birthFee, type BirthDraft, type BirthField } from "./birth";
import s from "./Certificates.module.css";

interface Props {
  draft: BirthDraft;
  set: <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => void;
  error: (k: BirthField) => string | undefined;
  busy: boolean;
  onSubmit: () => void;
}

/**
 * Section 4, a <form> of its own next to the application form. RAD-04: its radio group is also
 * name="type" with values 1–3, so `input[name=type][value='2']` matches a radio in each form.
 */
export function DeliveryForm({ draft, set, error, busy, onSubmit }: Props) {
  const { t } = useT();
  const err = (k: BirthField) => {
    const m = error(k);
    return m ? <span className="error" id={`bc-${k}-error`}>{m}</span> : null;
  };
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };
  const fee = birthFee(draft.copies, draft.delivery);

  return (
    <form className={`card ${s.section}`} aria-labelledby="bc-s4" noValidate onSubmit={submit}>
      <div className="card-title"><h2 id="bc-s4">{t("bc.s4")}</h2></div>
      <div className="card-body">
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>{t("bc.delivery")}</legend>
          <div className={s.radioList}>
            {DELIVERY_MODES.map((o) => (
              <label key={o.v} className={s.radioRow}>
                <input type="radio" name="type" value={o.v} checked={draft.delivery === o.v} onChange={() => set("delivery", o.v)} />
                <span><strong>{t(o.label)}</strong><span className="small muted"> — {t(o.hint)}</span></span>
              </label>
            ))}
          </div>
          {err("delivery")}
        </fieldset>

        {draft.delivery === "2" && (
          <div className={s.pair}>
            <div className="field">
              <label htmlFor="bc-address">{t("bc.address")}</label>
              <textarea id="bc-address" name="address" className="input" rows={3} autoComplete="street-address" value={draft.address}
                aria-invalid={!!error("address")} onChange={(e) => set("address", e.target.value)} />
              {err("address")}
            </div>
            <div className="field">
              <label htmlFor="bc-pin">{t("bc.pin")}</label>
              <input id="bc-pin" name="pin" className={`input ${s.short}`} inputMode="numeric" autoComplete="postal-code" maxLength={6}
                value={draft.pin} aria-invalid={!!error("pin")} onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} />
              {err("pin")}
            </div>
          </div>
        )}

        {draft.delivery === "3" && (
          <div className="field">
            <label htmlFor="bc-email">{t("bc.email")}</label>
            <input id="bc-email" name="email" type="email" className={`input ${s.wide}`} autoComplete="email" value={draft.email}
              aria-invalid={!!error("email")} onChange={(e) => set("email", e.target.value)} />
            {err("email")}
          </div>
        )}

        <div className="field">
          <label htmlFor="bc-copies">{t("bc.copies")}</label>
          <input id="bc-copies" name="copies" type="number" className={`input ${s.short}`} min={COPIES_MIN} max={COPIES_MAX} step={1}
            value={draft.copies} aria-invalid={!!error("copies")} aria-describedby="bc-copies-help"
            onChange={(e) => set("copies", e.target.value)} />
          <span className="help" id="bc-copies-help">{t("bc.copiesHelp", { fee: formatINR(BIRTH_FEES.perCopy, true), post: formatINR(BIRTH_FEES.speedPost, true) })}</span>
          {err("copies")}
        </div>

        <div className={s.feeRow}>
          <span>{t("bc.fee")}</span>
          <output id="bc-fee" className={s.fee}>{formatINR(fee)}</output>
        </div>
        <p className="small muted">{t("bc.feeNote")}</p>

        <div className={s.actions}>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("bc.submitting") : t("bc.submit")}</button>
        </div>
      </div>
    </form>
  );
}
