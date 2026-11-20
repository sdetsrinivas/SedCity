"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import type { Fees } from "./booking";
import s from "./Bookings.module.css";

export interface ConfirmSummary {
  venue: string;
  date: string;
  time: string;
  amenities: string;
  purpose: string;
  attendees: string;
  fees: Fees;
}

/**
 * DLG-06: the confirmation is a native <dialog>, always in the DOM (closed) and opened with showModal(),
 * so it sits in the top layer and the rest of the page is inert. Its buttons are in a
 * `<form method="dialog">`: either one closes the dialog and leaves its value in `dialog.returnValue`
 * ("confirm" or "back"); Escape closes it with an empty returnValue. The page acts on the `close` event.
 */
export function ConfirmDialog({ titleId, open, summary, onClose }: { titleId: string; open: boolean; summary: ConfirmSummary | null; onClose: (confirmed: boolean) => void }) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.returnValue = "";
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className={s.dialog} aria-labelledby={titleId} onClose={() => onClose(ref.current?.returnValue === "confirm")}>
      <h2 id={titleId} className={s.dialogTitle}>{t("bk.confirmTitle")}</h2>
      {summary && (
        <>
          <dl className={s.facts}>
            <div><dt>{t("bk.venue")}</dt><dd>{summary.venue}</dd></div>
            <div><dt>{t("bk.date")}</dt><dd>{summary.date}</dd></div>
            <div><dt>{t("bk.time")}</dt><dd>{summary.time}</dd></div>
            <div><dt>{t("bk.amenities")}</dt><dd>{summary.amenities}</dd></div>
            <div><dt>{t("bk.purpose")}</dt><dd>{summary.purpose}</dd></div>
            <div><dt>{t("bk.guests")}</dt><dd>{summary.attendees}</dd></div>
          </dl>
          <p className={s.dialogTotal}>
            <span>{t("bk.total")}</span> <strong>{formatINR(summary.fees.total)}</strong>
          </p>
          <p className="small muted">{t("bk.confirmNote", { deposit: formatINR(summary.fees.deposit) })}</p>
        </>
      )}
      <form method="dialog" className={s.dialogActions}>
        <button type="submit" value="back" className="btn btn-ghost">{t("bk.goBack")}</button>
        <button type="submit" value="confirm" className="btn btn-primary">{t("bk.confirm")}</button>
      </form>
    </dialog>
  );
}
