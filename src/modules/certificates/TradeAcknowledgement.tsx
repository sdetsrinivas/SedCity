"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import s from "./Certificates.module.css";

export interface TradeAck {
  ref: string;
  businessName: string;
  category: string;
  ward: string;
  fee: number;
  documents: number;
  account: string;
  mobile: string;
  inspectionInDays: number;
}

/** Shown after a trade licence application is saved: the application number and what happens next. */
export function TradeAcknowledgement({ ack, onRestart }: { ack: TradeAck; onRestart: () => void }) {
  const { t } = useT();
  return (
    <div className={`card card-body ${s.done}`} role="status" aria-live="polite">
      <span className={s.doneIcon}><Icon name="check" size={32} /></span>
      <h2>{t("tl.done")}</h2>
      <p className="muted">{t("tl.doneBody", { days: ack.inspectionInDays })}</p>
      <div className={s.refBox}>
        <span className="small muted">{t("tl.ref")}</span>
        <output className={s.refNo} id="tl-ref">{ack.ref}</output>
      </div>
      <dl className={s.facts}>
        <div><dt>{t("tl.businessName")}</dt><dd>{ack.businessName}</dd></div>
        <div><dt>{t("tl.categoryShort")}</dt><dd>{ack.category}</dd></div>
        <div><dt>{t("tl.ward")}</dt><dd>{ack.ward}</dd></div>
        <div><dt>{t("tl.feeShort")}</dt><dd>{formatINR(ack.fee)}</dd></div>
        <div><dt>{t("tl.docsShort")}</dt><dd>{ack.documents}</dd></div>
        <div><dt>{t("tl.accountShort")}</dt><dd>{ack.account}</dd></div>
      </dl>
      <p>{t("tl.smsSent", { mobile: ack.mobile })}</p>
      <div className={s.doneActions}>
        <Link href="/" className="btn btn-primary">{t("tl.toHome")}</Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>{t("tl.another")}</button>
      </div>
    </div>
  );
}
