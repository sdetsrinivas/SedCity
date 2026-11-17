"use client";
import { useT } from "@/i18n/client";
import { APPLICANT_TYPES, type BirthDraft, type BirthField } from "./birth";
import { ProofInput, type ProofMeta } from "./ProofInput";
import s from "./Certificates.module.css";

interface Props {
  draft: BirthDraft;
  set: <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => void;
  error: (k: BirthField) => string | undefined;
  proof: ProofMeta | null;
  onProof: (f: ProofMeta | null) => void;
}

/** Section 3: who is applying, their contact number and the proof of birth. Lives in the application form. */
export function ApplicantDetails({ draft, set, error, proof, onProof }: Props) {
  const { t } = useT();
  const err = (k: BirthField) => {
    const m = error(k);
    return m ? <span className="error" id={`bc-${k}-error`}>{m}</span> : null;
  };
  return (
    <>
      {/* RAD-04: name="type", values 1–3 — the delivery form further down uses the same name and values. */}
      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{t("bc.applicantType")}</legend>
        <div className={s.radioList}>
          {APPLICANT_TYPES.map((o) => (
            <label key={o.v} className={s.radioRow}>
              <input type="radio" name="type" value={o.v} checked={draft.applicantType === o.v} onChange={() => set("applicantType", o.v)} />
              <span>{t(o.label)}</span>
            </label>
          ))}
        </div>
        {err("applicantType")}
      </fieldset>

      <div className={s.pair}>
        <div className="field">
          <label htmlFor="bc-applicant-name">{t("bc.applicantName")}</label>
          <input id="bc-applicant-name" name="applicantName" className="input" autoComplete="name" value={draft.applicantName}
            aria-invalid={!!error("applicantName")} onChange={(e) => set("applicantName", e.target.value)} />
          {err("applicantName")}
        </div>
        <div className="field">
          <label htmlFor="bc-mobile">{t("bc.mobile")}</label>
          <input id="bc-mobile" name="mobile" className="input" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
            value={draft.mobile} aria-invalid={!!error("mobile")} aria-describedby="bc-mobile-help"
            onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <span className="help" id="bc-mobile-help">{t("bc.mobileHelp")}</span>
          {err("mobile")}
        </div>
      </div>

      <ProofInput value={proof} onChange={onProof} error={error("proof")} />
    </>
  );
}
