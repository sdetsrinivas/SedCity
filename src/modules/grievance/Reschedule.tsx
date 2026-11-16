"use client";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { formatDate, todayISO } from "@/lib/format";
import { pushSms } from "@/lib/sms";
import { getSession } from "@/lib/session";
import { rescheduleInspection, type GrievanceRecord } from "@/mock/endpoints/grievance";
import { InspectionCalendar } from "./InspectionCalendar";
import { formatTime } from "./time";
import { WINDOW_DAYS } from "./tracking";
import s from "./Track.module.css";

/** "Reschedule inspection" panel (stage: inspection scheduled). The calendar is DAT-06. */
export function Reschedule({ record, onDone }: { record: GrievanceRecord; onDone: (g: GrievanceRecord) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const panelId = useId();
  const time = formatTime(record.inspectionTime, t("gr.am"), t("gr.pm"));

  const confirm = async () => {
    if (!date) return setError("gt.errNoDate");
    if (date === record.inspectionDate) return setError("gt.errSameDate");
    setBusy(true);
    setError(null);
    try {
      const next = await rescheduleInspection(record.ref, date);
      const mobile = record.mobile ?? getSession()?.mobile.replace(/\D/g, "").slice(-10);
      if (mobile) pushSms(mobile, t("gt.smsReschedule", { ref: record.ref, date: formatDate(date), time }));
      setDone(date);
      setOpen(false);
      setDate(null);
      onDone(next);
    } catch {
      setError("gt.errReschedule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`no-print ${s.action}`}>
      {done && <div className="alert alert-success" role="status">{t("gt.rescheduled", { date: formatDate(done), time })}</div>}
      <button type="button" className="btn btn-outline" aria-expanded={open} aria-controls={panelId}
        onClick={() => { setOpen((o) => !o); setError(null); setDone(null); }}>
        {t("gt.reschedule")}
      </button>
      {open && (
        <div id={panelId} className={s.panel} role="group" aria-labelledby={`${panelId}-title`}>
          <h3 id={`${panelId}-title`} className={s.subhead}>{t("gt.rescheduleTitle")}</h3>
          <p className="small muted">{t("gt.rescheduleHelp", { days: WINDOW_DAYS })}</p>
          <InspectionCalendar value={date} onChange={(d) => { setDate(d); setError(null); }} today={todayISO()} />
          <p className={s.newDate}>
            <span className="muted">{t("gt.newDate")}:</span>{" "}
            <output id="gt-new-date">{date ? formatDate(date) : t("gt.noneChosen")}</output>
          </p>
          {error && <p className="error" role="alert">{t(error)}</p>}
          <div className={s.panelActions}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirm()}>
              {busy ? t("gt.saving") : t("gt.confirmDate")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setDate(null); setError(null); }}>{t("gt.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
