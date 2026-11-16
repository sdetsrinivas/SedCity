"use client";
import { useT } from "@/i18n/client";
import { normalizeConsumerNo } from "./bill";
import s from "./Water.module.css";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  formatError: boolean;
}

export function ConsumerLookup({ value, onChange, onSubmit, loading, formatError }: Props) {
  const { t } = useT();
  return (
    <section className={`card ${s.lookup}`} aria-labelledby="wt-lookup-title">
      <div className="card-body">
        <h2 id="wt-lookup-title" className={s.sectionTitle}>{t("wt.lookupTitle")}</h2>
        <form
          className={s.lookupForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) onSubmit();
          }}
        >
          <div className={`field ${s.lookupField}`}>
            <label htmlFor="consumerNo">{t("wt.consumerNo")}</label>
            {/* TXT-04: typed text is kept as-is while the field has focus; on blur it is rewritten to "W02-014-00731". */}
            <input
              id="consumerNo"
              name="consumerNo"
              className={`input ${s.mono}`}
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={(e) => {
                const formatted = normalizeConsumerNo(e.target.value);
                if (formatted && formatted !== e.target.value) onChange(formatted);
              }}
              aria-invalid={formatError}
              aria-describedby={formatError ? "consumerNo-help consumerNo-err" : "consumerNo-help"}
            />
            <span className="help" id="consumerNo-help">{t("wt.consumerHelp")}</span>
            {formatError && <span className="error" id="consumerNo-err">{t("wt.errFormat")}</span>}
          </div>
          <button type="submit" className={`btn btn-primary ${s.fetchBtn}`} disabled={loading}>
            {t("wt.fetch")}
          </button>
        </form>
        {loading && (
          <p className={s.loading} role="status">
            <span className={s.spinner} aria-hidden="true" /> {t("wt.fetching")}
          </p>
        )}
      </div>
    </section>
  );
}
