"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { HOSPITALS } from "@/mock/endpoints/certificates";
import { DOB_MIN, NAME_MAX, OTHER_PLACE, type BirthDraft, type BirthField } from "./birth";
import s from "./Certificates.module.css";

const SEXES = [
  { v: "F", label: "bc.female" },
  { v: "M", label: "bc.male" },
  { v: "T", label: "bc.transgender" },
] as const;

interface Props {
  draft: BirthDraft;
  set: <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => void;
  error: (k: BirthField) => string | undefined;
  /** Local ISO date, known only after hydration (avoids a server/client mismatch in `max`). */
  today: string | null;
}

/** Section 1 of the birth certificate application: the child and the place of birth. */
export function ChildDetails({ draft, set, error, today }: Props) {
  const { t, lang } = useT();
  const err = (k: BirthField) => {
    const m = error(k);
    return m ? <span className="error" id={`bc-${k}-error`}>{m}</span> : null;
  };
  return (
    <>
      {/* TXT-10: maxlength on the child's name — typed text beyond 40 characters is dropped silently. */}
      <div className="field">
        <label htmlFor="bc-child-name">{t("bc.childName")}</label>
        <input id="bc-child-name" name="childName" className={`input ${s.wide}`} autoComplete="off" maxLength={NAME_MAX}
          value={draft.childName} aria-invalid={!!error("childName")} aria-describedby="bc-child-name-help"
          onChange={(e) => set("childName", e.target.value)} />
        <span className="help" id="bc-child-name-help">
          {t("bc.childNameHelp")} <span className={s.counter}>{t("bc.chars", { n: draft.childName.length, max: NAME_MAX })}</span>
        </span>
        {err("childName")}
      </div>

      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{t("bc.sex")}</legend>
        <div className={s.inlineRadios}>
          {SEXES.map((o) => (
            <label key={o.v} className="check">
              <input type="radio" name="sex" value={o.v} checked={draft.sex === o.v} onChange={() => set("sex", o.v)} />
              {t(o.label)}
            </label>
          ))}
        </div>
        {err("sex")}
      </fieldset>

      {/* DAT-01: native date input. The value is always ISO (yyyy-mm-dd); what it shows and the typing order follow the browser's locale. */}
      <div className="field">
        <label htmlFor="bc-dob">{t("bc.dob")}</label>
        <input id="bc-dob" name="dob" type="date" className={`input ${s.date}`} min={DOB_MIN} max={today ?? undefined}
          value={draft.dob} aria-invalid={!!error("dob")} aria-describedby="bc-dob-help"
          onChange={(e) => set("dob", e.target.value)} />
        <span className="help" id="bc-dob-help">{t("bc.dobHelp")}</span>
        {err("dob")}
      </div>

      {/* DRP-01: plain native <select>; option values are hospital codes (H01…), the text is the hospital name. */}
      <div className="field">
        <label htmlFor="bc-hospital">{t("bc.hospital")}</label>
        <select id="bc-hospital" name="hospital" className={`select ${s.wide}`} value={draft.hospital}
          aria-invalid={!!error("hospital")} onChange={(e) => set("hospital", e.target.value)}>
          <option value="">{t("bc.hospitalChoose")}</option>
          {HOSPITALS.map((h) => <option key={h.id} value={h.id}>{pick(h, lang)}</option>)}
          <option value={OTHER_PLACE}>{t("bc.hospitalOther")}</option>
        </select>
        {err("hospital")}
      </div>

      {draft.hospital === OTHER_PLACE && (
        <div className="field">
          <label htmlFor="bc-place">{t("bc.place")}</label>
          <textarea id="bc-place" name="place" className={`input ${s.wide}`} rows={2} value={draft.place}
            aria-invalid={!!error("place")} onChange={(e) => set("place", e.target.value)} />
          {err("place")}
        </div>
      )}
    </>
  );
}
