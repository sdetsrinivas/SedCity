"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { formatDate } from "@/lib/format";
import type { WaterBill } from "@/mock/endpoints/water";
import { ChargesTable } from "./ChargesTable";
import { AmountDue } from "./AmountDue";
import s from "./Water.module.css";

export function BillDetails({ bill }: { bill: WaterBill }) {
  const { t, lang } = useT();
  const rows: [string, string][] = [
    [t("wt.consumerName"), pick(bill.name, lang)],
    [t("wt.address"), bill.address],
    [t("wt.ward"), pick(bill.ward, lang)],
    [t("wt.category"), t(bill.category === "domestic" ? "wt.domestic" : "wt.commercial")],
    [t("wt.meterNo"), bill.meterNo],
    [t("wt.billNo"), bill.billNo],
    [t("wt.billDate"), formatDate(bill.billDate)],
    [t("wt.period"), t("wt.periodRange", { from: formatDate(bill.periodFrom), to: formatDate(bill.periodTo) })],
    [t("wt.readings"), `${bill.previousReading} → ${bill.currentReading}`],
    [t("wt.consumption"), t("wt.kl", { n: bill.consumption })],
  ];
  return (
    <section id="bill-details" className={`card ${s.bill}`} aria-labelledby="wt-bill-title">
      <div className="card-title">
        <h2 id="wt-bill-title">{t("wt.billTitle")}</h2>
        <span className={`badge ${bill.paid ? s.paid : s.unpaid}`}>{t(bill.paid ? "wt.statusPaid" : "wt.statusUnpaid")}</span>
      </div>
      <div className={`card-body ${s.billBody}`}>
        <div className={s.billMain}>
          <p className={s.consumerNo}>{bill.consumerNo}</p>
          <dl className={s.facts}>
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <ChargesTable charges={bill.charges} />
        </div>
        <AmountDue bill={bill} />
      </div>
    </section>
  );
}
