"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { fetchEstimate, type Estimate } from "@/mock/endpoints/electricity";
import { streetById, wardById, zones } from "@/mock/endpoints/geo";
import type { Draft, Errors } from "./types";
import s from "./Electricity.module.css";

/**
 * Review step.
 * BTN-05: the estimated-charges panel is fetched (REVIEW_BANNER, 1.5s) and inserted ABOVE the
 *   summary, so the Submit button below moves down ~200px after the page looks settled.
 * CHK-04: the declaration checkbox is visually hidden (.sr-only, 1×1px clipped); the styled
 *   <label> draws the box and is the only thing a user can click.
 */
export function StepReview({ draft, goTo, declared, setDeclared, errors }: {
  draft: Draft; goTo: (step: number) => void; declared: boolean; setDeclared: (v: boolean) => void; errors: Errors;
}) {
  const { t, lang } = useT();
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    if (!draft.connType || !draft.phase) return;
    fetchEstimate(draft.connType, draft.phase, Number(draft.load)).then(setEstimate);
  }, [draft.connType, draft.phase, draft.load]);

  const zone = zones.find((z) => z.id === draft.zoneId);
  const ward = wardById(draft.wardId);
  const street = streetById(draft.streetId);
  const typeKey: Record<string, DictKey> = { domestic: "el.domestic", commercial: "el.commercial", industrial: "el.industrial" };

  const sections: { step: number; title: DictKey; rows: [DictKey, string][] }[] = [
    { step: 1, title: "el.step1", rows: [
      ["el.connType", draft.connType ? t(typeKey[draft.connType]) : ""],
      ["el.phase", draft.phase ? t(draft.phase === "single" ? "el.single" : "el.three") : ""],
      ["el.load", `${draft.load} kW`],
    ] },
    { step: 2, title: "el.step2", rows: [
      ["el.name", draft.name], ["el.astheenId", draft.astheenId], ["el.mobile", draft.mobile], ["el.email", draft.email || "—"],
    ] },
    { step: 3, title: "el.step3", rows: [
      ["el.door", draft.door], ["el.street", street?.name ?? ""], ["el.ward", ward ? pick(ward, lang) : ""],
      ["el.zone", zone ? pick(zone, lang) : ""], ["el.pincode", street?.pincode ?? ""], ["el.landmark", draft.landmark || "—"],
    ] },
    { step: 4, title: "el.step4", rows: [
      ["el.inspection", formatDate(draft.inspectionDate)],
      ["el.idProof", draft.idProof?.name ?? ""], ["el.ownership", draft.ownershipProof?.name ?? ""],
    ] },
  ];

  return (
    <>
      {estimate && (
        <section className={s.estimate} aria-labelledby="el-estimate-title">
          <h3 id="el-estimate-title">{t("el.estimateTitle")}</h3>
          <dl>
            <div><dt>{t("el.deposit")}</dt><dd>{formatINR(estimate.deposit)}</dd></div>
            <div><dt>{t("el.serviceCharge")}</dt><dd>{formatINR(estimate.serviceCharge)}</dd></div>
            <div><dt>{t("el.appFee")}</dt><dd>{formatINR(estimate.applicationFee)}</dd></div>
            <div className={s.estTotal}><dt>{t("el.total")}</dt><dd>{formatINR(estimate.total)}</dd></div>
          </dl>
        </section>
      )}
      {sections.map((sec) => (
        <section key={sec.step} className={s.summary} aria-labelledby={`el-sum-${sec.step}`}>
          <div className={s.summaryHead}>
            <h3 id={`el-sum-${sec.step}`}>{t(sec.title)}</h3>
            <button type="button" className="btn btn-ghost" onClick={() => goTo(sec.step)}>{t("el.edit")}</button>
          </div>
          <dl className={s.summaryList}>
            {sec.rows.map(([k, v]) => <div key={k}><dt>{t(k)}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>
      ))}
      {/* CHK-04: visually hidden native input + styled label */}
      <div className={s.declare}>
        <input id="el-declare" type="checkbox" className="sr-only" checked={declared} onChange={(e) => setDeclared(e.target.checked)} aria-invalid={!!errors.declare} />
        <label htmlFor="el-declare" className={s.fancyCheck}>{t("el.declare")}</label>
      </div>
      {errors.declare && <span className="error">{t(errors.declare as DictKey)}</span>}
    </>
  );
}
