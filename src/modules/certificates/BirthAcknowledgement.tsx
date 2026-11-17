"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate, formatINR } from "@/lib/format";
import s from "./Certificates.module.css";

export interface BirthAck {
  ref: string;
  childName: string;
  dob: string;
  place: string;
  delivery: string;
  copies: number;
  fee: number;
  mobile: string;
  readyInDays: number;
}

/** Shown after a birth certificate application is saved: the application number and what happens next. */
export function BirthAcknowledgement({ ack, onRestart }: { ack: BirthAck; onRestart: () => void }) {
  const { t } = useT();
  return (
    <div className={`card card-body ${s.done}`} role="status" aria-live="polite">
      <span className={s.doneIcon}><Icon name="check" size={32} /></span>
      <h2>{t("bc.done")}</h2>
      <p className="muted">{t("bc.doneBody", { days: ack.readyInDays })}</p>
      <div className={s.refBox}>
        <span className="small muted">{t("bc.ref")}</span>
        <output className={s.refNo} id="bc-ref">{ack.ref}</output>
      </div>
      <dl className={s.facts}>
        <div><dt>{t("bc.childName")}</dt><dd>{ack.childName}</dd></div>
        <div><dt>{t("bc.dob")}</dt><dd>{formatDate(ack.dob)}</dd></div>
        <div><dt>{t("bc.placeShort")}</dt><dd>{ack.place}</dd></div>
        <div><dt>{t("bc.deliveryShort")}</dt><dd>{ack.delivery}</dd></div>
        <div><dt>{t("bc.copiesShort")}</dt><dd>{ack.copies}</dd></div>
        <div><dt>{t("bc.fee")}</dt><dd>{formatINR(ack.fee)}</dd></div>
      </dl>
      <p>{t("bc.smsSent", { mobile: ack.mobile })}</p>
      <div className={s.doneActions}>
        <Link href="/" className="btn btn-primary">{t("bc.toHome")}</Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>{t("bc.another")}</button>
      </div>
    </div>
  );
}
