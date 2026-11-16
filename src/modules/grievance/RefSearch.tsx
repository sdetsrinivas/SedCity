"use client";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { normaliseRefInput } from "./tracking";
import s from "./Track.module.css";

export interface FieldError {
  key: DictKey;
  vars?: Record<string, string | number>;
}

/**
 * TXT-05: the grievance number is a React-controlled input. What is shown comes from React state
 * (upper-cased, spaces removed); the Track button reads that state, never the DOM value. Changing
 * `.value` from a script (even followed by an `input` event) does not reach the state, so the search
 * runs with the old text and the next render puts the state's value back in the field.
 */
export function RefSearch({ value, onChange, onSubmit, busy, error }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: FieldError | null;
}) {
  const { t } = useT();
  return (
    <section className="card" aria-labelledby="gt-search-title">
      <div className="card-title"><h2 id="gt-search-title">{t("gt.searchTitle")}</h2></div>
      <form className={`card-body ${s.search}`} noValidate role="search" aria-labelledby="gt-search-title"
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className={`field ${s.searchField}`}>
          <label htmlFor="gt-ref">{t("gt.refLabel")}</label>
          <input
            id="gt-ref"
            name="grievanceNumber"
            className={`input ${s.refInput}`}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(normaliseRefInput(e.target.value))}
            aria-invalid={!!error}
            aria-describedby={error ? "gt-ref-help gt-ref-error" : "gt-ref-help"}
          />
          <span className="help" id="gt-ref-help">{t("gt.refHelp")}</span>
          {error && <span className="error" id="gt-ref-error" role="alert">{t(error.key, error.vars)}</span>}
        </div>
        <button type="submit" className={`btn btn-primary ${s.trackBtn}`} disabled={busy}>
          {busy ? t("gt.searching") : t("gt.track")}
        </button>
      </form>
    </section>
  );
}
