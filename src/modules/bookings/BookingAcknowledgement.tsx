"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate, formatINR } from "@/lib/format";
import s from "./Bookings.module.css";

export interface BookingAck {
  ref: string;
  venue: string;
  date: string;
  time: string;
  amenities: string;
  total: number;
  payBy: string;
  mobile: string;
}

/** Shown once a booking is saved: the booking number, what was booked and how to pay. */
export function BookingAcknowledgement({ ack, onRestart }: { ack: BookingAck; onRestart: () => void }) {
  const { t } = useT();
  return (
    <div className={`card card-body ${s.done}`} role="status" aria-live="polite">
      <span className={s.doneIcon}><Icon name="check" size={32} /></span>
      <h2>{t("bk.done")}</h2>
      <p className="muted">{t("bk.doneBody", { total: formatINR(ack.total), date: formatDate(ack.payBy) })}</p>
      <div className={s.refBox}>
        <span className="small muted">{t("bk.ref")}</span>
        <output className={s.refNo}>{ack.ref}</output>
      </div>
      <dl className={s.facts}>
        <div><dt>{t("bk.venue")}</dt><dd>{ack.venue}</dd></div>
        <div><dt>{t("bk.date")}</dt><dd>{formatDate(ack.date)}</dd></div>
        <div><dt>{t("bk.time")}</dt><dd>{ack.time}</dd></div>
        <div><dt>{t("bk.amenities")}</dt><dd>{ack.amenities}</dd></div>
        <div><dt>{t("bk.total")}</dt><dd>{formatINR(ack.total)}</dd></div>
      </dl>
      <p>{t("bk.smsSent", { mobile: ack.mobile })}</p>
      <div className={s.doneActions}>
        <Link href="/" className="btn btn-primary">{t("bk.toHome")}</Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>{t("bk.another")}</button>
      </div>
    </div>
  );
}
