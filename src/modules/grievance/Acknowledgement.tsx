"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import s from "./Grievance.module.css";

export interface Ack {
  ref: string;
  category: string;
  ward: string;
  time: string;
  photos: number;
  mobile: string;
  dueISO: string;
}

/** Shown after a grievance is registered: the grievance number and what happens next. */
export function Acknowledgement({ ack, onRestart }: { ack: Ack; onRestart: () => void }) {
  const { t } = useT();
  return (
    <div className={`card card-body ${s.done}`} role="status" aria-live="polite">
      <span className={s.doneIcon}><Icon name="check" size={32} /></span>
      <h2>{t("gr.done")}</h2>
      <p className="muted">{t("gr.doneBody")}</p>
      <div className={s.refBox}>
        <span className="small muted">{t("gr.ref")}</span>
        <output className={s.refNo} id="gr-ref">{ack.ref}</output>
      </div>
      <dl className={s.facts}>
        <div><dt>{t("gr.category")}</dt><dd>{ack.category}</dd></div>
        <div><dt>{t("gr.ward")}</dt><dd>{ack.ward}</dd></div>
        <div><dt>{t("gr.time")}</dt><dd>{ack.time}</dd></div>
        <div><dt>{t("gr.photosShort")}</dt><dd>{ack.photos}</dd></div>
        <div><dt>{t("gr.due")}</dt><dd>{formatDate(ack.dueISO)}</dd></div>
      </dl>
      <p>{t("gr.smsSent", { mobile: ack.mobile })}</p>
      <div className={s.doneActions}>
        <Link href="/grievances/track" className="btn btn-primary">{t("gr.toTrack")}</Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>{t("gr.another")}</button>
      </div>
    </div>
  );
}
