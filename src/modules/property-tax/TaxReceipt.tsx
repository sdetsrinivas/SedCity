"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime, formatINR } from "@/lib/format";
import type { PaySession } from "@/mock/endpoints/astheenpay";
import type { AssessmentRecord } from "@/mock/endpoints/property";
import s from "./PropertyTax.module.css";

const METHOD_KEY: Record<PaySession["method"], DictKey> = { card: "pt.mCard", upi: "pt.mUpi", netbanking: "pt.mNet" };

/** Shown after AstheenPay reports a successful payment. */
export function TaxReceipt({ receiptNo, pay, record, periodLabel }: { receiptNo: string; pay: PaySession; record: AssessmentRecord; periodLabel: string }) {
  const { t, lang } = useT();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.scrollIntoView?.({ block: "start" });
  }, []);
  const rows: [string, string][] = [
    [t("pt.rReceiptNo"), receiptNo],
    [t("pt.rTxn"), pay.txnId!],
    [t("pt.rPaidOn"), formatDateTime(pay.paidAt!)],
    [t("pt.assessmentNo"), record.no],
    [t("pt.owner"), pick(record.owner, lang)],
    [t("pt.rPeriod"), periodLabel],
    [t("pt.rMethod"), `${t(METHOD_KEY[pay.method])}${pay.instrument ? ` (${pay.instrument})` : ""}`],
    [t("pt.rTax"), formatINR(pay.amount)],
    [t("pt.fee"), formatINR(pay.fee)],
    [t("pt.totalCharge"), formatINR(pay.amount + pay.fee)],
  ];
  return (
    <section ref={section} id="tax-receipt" className={`card ${s.receipt}`} aria-labelledby="pt-receipt-title">
      <div className="card-body">
        <div className={s.receiptHead}>
          <span className={s.tick} aria-hidden="true"><Icon name="check" size={26} /></span>
          <div>
            <h2 id="pt-receipt-title">{t("pt.receiptTitle")}</h2>
            <p className="muted">{t("pt.receiptLead")}</p>
          </div>
        </div>
        <dl className={s.receiptRows}>
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}
