"use client";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { PAY_METHODS, type PayMethod } from "@/modules/water/payment";
import { InfoTip } from "./InfoTip";
import { TAX_RATE, type TaxBreakdown } from "./tax";
import s from "./PropertyTax.module.css";

const METHOD: Record<PayMethod, { label: DictKey; note: DictKey }> = {
  card: { label: "pt.mCard", note: "pt.mCardNote" },
  upi: { label: "pt.mUpi", note: "pt.mUpiNote" },
  netbanking: { label: "pt.mNet", note: "pt.mNetNote" },
};

interface Props {
  tax: TaxBreakdown | null;
  /** Locality's base rate and the usage factor, for the unit-area-value tooltip. */
  uavText: string;
  periodLabel: string;
  dueISO: string;
  method: PayMethod | null;
  fee: number;
  methodError?: DictKey;
  onMethod: (m: PayMethod) => void;
  onProceed: () => void;
}

const pct = (r: number) => `${Math.round(r * 100)}%`;

/** The calculation, the payment method and the desktop "Proceed to pay" button (BTN-10: hidden below 900px). */
export function TaxSummary({ tax, uavText, periodLabel, dueISO, method, fee, methodError, onMethod, onProceed }: Props) {
  const { t } = useT();
  const money = (n: number | undefined) => (tax && n !== undefined ? formatINR(n) : "—");
  return (
    <aside className={`card ${s.summary}`} aria-labelledby="pt-summary-title">
      <div className="card-title">
        <h2 id="pt-summary-title">{t("pt.summaryTitle")}</h2>
      </div>
      <div className="card-body">
        <p className={s.period}>{periodLabel}</p>
        <dl className={s.calc}>
          <div>
            <dt className={s.uavTerm}>
              {t("pt.uav")}
              {/* DLG-12: tooltip explaining the unit area value. */}
              <InfoTip label={t("pt.uavInfo")} text={uavText} />
            </dt>
            <dd id="pt-uav">{tax ? t("pt.uavValue", { v: tax.uav.toFixed(2) }) : "—"}</dd>
          </div>
          <div><dt>{t("pt.sumArv")}</dt><dd>{money(tax?.arv)}</dd></div>
          <div><dt>{t("pt.sumDepreciation", { p: pct(tax?.depreciationRate ?? 0) })}</dt><dd>{tax ? `− ${formatINR(tax.depreciation)}` : "—"}</dd></div>
          <div><dt>{t("pt.sumNetArv")}</dt><dd>{money(tax?.netArv)}</dd></div>
          <div><dt>{t("pt.sumAnnual", { p: pct(TAX_RATE) })}</dt><dd>{money(tax?.annualTax)}</dd></div>
          <div><dt>{t("pt.sumHalf")}</dt><dd>{money(tax?.halfYearTax)}</dd></div>
          <div><dt>{t("pt.sumRebate", { p: pct(tax?.rebateRate ?? 0) })}</dt><dd>{tax ? `− ${formatINR(tax.rebate)}` : "—"}</dd></div>
          <div className={s.calcTotal}><dt>{t("pt.sumPayable")}</dt><dd id="pt-payable">{tax ? formatINR(tax.payable) : "—"}</dd></div>
        </dl>
        {!tax && <p className="small muted">{t("pt.sumIncomplete")}</p>}
        <p className="small muted">{t("pt.dueBy", { date: formatDate(dueISO) })}</p>

        <fieldset className={s.methods} aria-describedby={methodError ? "pt-method-err" : undefined}>
          <legend className="label">{t("pt.payUsing")}</legend>
          {PAY_METHODS.map((m) => (
            <label key={m} className="check">
              <input type="radio" name="ptPayMethod" value={m} checked={method === m} onChange={() => onMethod(m)} />
              <span>{t(METHOD[m].label)} <span className="small muted">({t(METHOD[m].note)})</span></span>
            </label>
          ))}
          {methodError && <span className="error" id="pt-method-err">{t(methodError)}</span>}
        </fieldset>

        <dl className={s.calc}>
          <div><dt>{t("pt.fee")}</dt><dd>{method && tax ? formatINR(fee) : "—"}</dd></div>
          <div className={s.calcTotal}><dt>{t("pt.totalCharge")}</dt><dd id="pt-charge-total">{tax ? formatINR(tax.payable + fee) : "—"}</dd></div>
        </dl>

        {/* BTN-10: desktop copy of "Proceed to pay" (comes after the mobile copy in the DOM). */}
        <button type="button" className={`btn btn-accent btn-block ${s.proceedDesktop}`} onClick={onProceed}>
          {t("pt.proceed")}
        </button>
      </div>
    </aside>
  );
}
