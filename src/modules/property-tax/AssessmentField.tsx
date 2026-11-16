"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { delayFor } from "@/mock/api";
import { checkAssessment, type AssessmentRecord } from "@/mock/endpoints/property";
import { normalizeAssessmentNo } from "./tax";
import type { CheckStatus } from "./types";
import s from "./PropertyTax.module.css";

interface Props {
  value: string;
  status: CheckStatus;
  record: AssessmentRecord | null;
  period: string;
  periodLabel: string;
  error?: DictKey;
  onChange: (v: string) => void;
  onResult: (status: CheckStatus, record: AssessmentRecord | null) => void;
}

/**
 * TXT-13: debounced async validation. Nothing happens while the owner types; ASSESSMENT_DEBOUNCE (500ms)
 * after the last keystroke the number is format-checked and then verified by ASSESSMENT_CHECK (1s),
 * showing "Verifying…" and finally the owner/address or an error under the field. Every keystroke
 * resets the status and discards any answer still in flight, so only the last value's result shows.
 */
export function AssessmentField({ value, status, record, period, periodLabel, error, onChange, onResult }: Props) {
  const { t, lang } = useT();
  const requestId = useRef(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const mine = ++requestId.current;
    if (!value.trim()) return;
    const timer = setTimeout(async () => {
      const no = normalizeAssessmentNo(value);
      if (!no) return onResultRef.current("format", null);
      onResultRef.current("checking", null);
      try {
        const rec = await checkAssessment(no, period);
        if (mine !== requestId.current) return;
        onResultRef.current(!rec ? "notFound" : rec.paidReceipt ? "paid" : "found", rec);
      } catch {
        if (mine === requestId.current) onResultRef.current("error", null);
      }
    }, delayFor("ASSESSMENT_DEBOUNCE"));
    return () => clearTimeout(timer);
  }, [value, period]);

  const message: Partial<Record<CheckStatus, DictKey>> = {
    format: "pt.errFormat",
    notFound: "pt.errNotFound",
    error: "pt.errService",
  };
  const bad = status === "format" || status === "notFound" || status === "error";

  return (
    <div className={`field ${s.assessField}`}>
      <label htmlFor="assessmentNo">{t("pt.assessmentNo")}</label>
      <input
        id="assessmentNo"
        name="assessmentNo"
        className="input"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={bad || (!!error && status !== "found")}
        aria-describedby="assessmentNo-help assessmentNo-status"
      />
      <span className="help" id="assessmentNo-help">{t("pt.assessmentHelp")}</span>
      <div id="assessmentNo-status" className={s.checkStatus} aria-live="polite">
        {status === "checking" && (
          <span className={s.checking}><span className={s.spinner} aria-hidden="true" /> {t("pt.verifying")}</span>
        )}
        {bad && <span className="error">{t(message[status]!)}</span>}
        {status === "idle" && error && <span className="error">{t(error)}</span>}
        {(status === "found" || status === "paid") && record && (
          <div className={status === "found" ? s.found : s.paidNote}>
            <p className={s.foundHead}>
              <Icon name={status === "found" ? "check" : "info"} size={16} />
              {status === "found" ? t("pt.found") : t("pt.alreadyPaid", { period: periodLabel, receipt: record.paidReceipt ?? "" })}
            </p>
            <dl className={s.foundFacts}>
              <div><dt>{t("pt.owner")}</dt><dd>{pick(record.owner, lang)}</dd></div>
              <div><dt>{t("pt.address")}</dt><dd>{record.address}</dd></div>
              <div><dt>{t("pt.ward")}</dt><dd>{pick(record.ward, lang)}</dd></div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
