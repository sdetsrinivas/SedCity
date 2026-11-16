"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime, formatINR } from "@/lib/format";
import type { PaySession } from "@/mock/endpoints/astheenpay";
import type { WaterBill } from "@/mock/endpoints/water";
import type { DictKey } from "@/i18n";
import { receiptFileName, receiptPdf } from "./receiptPdf";
import s from "./Payment.module.css";

const METHOD_KEY: Record<PaySession["method"], DictKey> = { card: "wt.mCard", upi: "wt.mUpi", netbanking: "wt.mNet" };
const METHOD_EN: Record<PaySession["method"], string> = { card: "Debit / credit card", upi: "UPI", netbanking: "Net banking" };
const rs = (n: number) => `Rs. ${formatINR(n).replace(/[^\d.,]/g, "")}`;

/** FIL-05: "Download receipt (PDF)" builds the PDF in the browser and saves it through a temporary blob link. */
export function Receipt({ receiptNo, pay, bill }: { receiptNo: string; pay: PaySession; bill: WaterBill }) {
  const billTotal = bill.charges.total;
  const { t } = useT();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.scrollIntoView?.({ block: "start" });
  }, []);
  const balance = Math.max(0, Math.round((billTotal - pay.amount) * 100) / 100);
  const paidAt = formatDateTime(pay.paidAt!);
  const rows: [string, string][] = [
    [t("wt.rReceiptNo"), receiptNo],
    [t("wt.rTxn"), pay.txnId!],
    [t("wt.rPaidOn"), paidAt],
    [t("wt.rConsumer"), bill.consumerNo],
    [t("wt.rBill"), bill.billNo],
    [t("wt.rMethod"), `${t(METHOD_KEY[pay.method])}${pay.instrument ? ` (${pay.instrument})` : ""}`],
    [t("wt.rAmount"), formatINR(pay.amount)],
    [t("wt.rFee"), formatINR(pay.fee)],
    [t("wt.rTotal"), formatINR(pay.amount + pay.fee)],
    ...(balance > 0 ? [[t("wt.rBalance"), formatINR(balance)] as [string, string]] : []),
  ];

  const download = () => {
    const asciiInstrument = (pay.instrument ?? "").replace(/[^\x20-\x7e]/g, "").trim();
    const pdf = receiptPdf({
      receiptNo,
      issuedAt: paidAt,
      rows: [
        ["Transaction ID", pay.txnId!],
        ["Paid on", paidAt],
        ["Consumer number", bill.consumerNo],
        ["Bill number", bill.billNo],
        ["Payment method", `${METHOD_EN[pay.method]}${asciiInstrument ? ` (${asciiInstrument})` : ""}`],
        ["Amount paid towards bill", rs(pay.amount)],
        ["Convenience fee", rs(pay.fee)],
        ["Total charged", rs(pay.amount + pay.fee)],
        ...(balance > 0 ? [["Balance carried forward", rs(balance)] as [string, string]] : []),
      ],
    });
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = receiptFileName(receiptNo);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section ref={section} id="payment-receipt" className={`card ${s.receipt}`} aria-labelledby="wt-receipt-title">
      <div className="card-body">
        <div className={s.receiptHead}>
          <span className={s.tick} aria-hidden="true"><Icon name="check" size={26} /></span>
          <div>
            <h2 id="wt-receipt-title">{t("wt.receiptTitle")}</h2>
            <p className="muted">{t("wt.receiptLead")}</p>
          </div>
        </div>
        <dl className={s.receiptRows}>
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {pay.email && <div className="alert alert-success" role="status">{t("wt.emailed", { email: pay.email })}</div>}
        <button type="button" className="btn btn-primary" onClick={download}>
          <Icon name="download" size={18} /> {t("wt.download")}
        </button>
      </div>
    </section>
  );
}
