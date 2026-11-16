"use client";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { delayFor } from "@/mock/api";
import { categoryById, checkGrievanceStatus, type GrievanceRecord } from "@/mock/endpoints/grievance";
import { wardById } from "@/mock/endpoints/geo";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatTime } from "./time";
import { STAGES, STAGE_INSPECTION, STAGE_RESOLVED } from "./tracking";
import { Reschedule } from "./Reschedule";
import { Feedback } from "./Feedback";
import s from "./Track.module.css";

const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour12: false });

/** Status of one grievance: current stage, timeline, details, print, and the actions open at that stage. */
export function StatusCard({ initial, onUpdate }: { initial: GrievanceRecord; onUpdate: () => void }) {
  const { t, lang } = useT();
  const [g, setG] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkedAt, setCheckedAt] = useState(() => new Date());
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  const resolved = g.stage >= STAGE_RESOLVED;

  // DYN-05: while the grievance is open the status is checked again every GRIEVANCE_POLL (5s); each
  // check takes GRIEVANCE_STATUS and may move the stage on. Nothing is reloaded: the text changes in place.
  useEffect(() => {
    if (resolved) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(tick, Math.max(200, delayFor("GRIEVANCE_POLL"))); };
    const tick = async () => {
      setChecking(true);
      try {
        const next = await checkGrievanceStatus(g.ref);
        if (cancelled) return;
        if (next) setG(next);
        setCheckFailed(false);
        setCheckedAt(new Date());
        onUpdate();
      } catch {
        if (!cancelled) setCheckFailed(true);
      } finally {
        if (!cancelled) { setChecking(false); schedule(); }
      }
    };
    schedule();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [g.ref, resolved]); // onUpdate only bumps a counter in the parent, so the first closure is enough


  // DLG-16: Ctrl+P prints the same acknowledgement as the button.
  useEffect(() => {
    const before = () => setPrintedAt(new Date());
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, []);

  /** DLG-16: opens the browser's print dialog (window.print()); print CSS keeps only this card. */
  const print = () => {
    flushSync(() => setPrintedAt(new Date()));
    window.print();
  };

  const updated = (next: GrievanceRecord) => { setG(next); onUpdate(); };

  const category = pick(categoryById(g.category) ?? { en: g.category, ta: g.category }, lang);
  const ward = wardById(g.ward);
  const time = formatTime(g.inspectionTime, t("gr.am"), t("gr.pm"));
  const stageKey = STAGES[g.stage];
  const noteFor = (k: number) => {
    const key = STAGES[k];
    if (key === "assigned") return t("gt.note.assigned", { zone: ward?.zoneId.slice(1) ?? "" });
    if (key === "inspection") return t("gt.note.inspection", { date: g.inspectionDate ? formatDate(g.inspectionDate) : "", time });
    return t(`gt.note.${key}`);
  };

  return (
    <section className={`card print-area ${s.status}`} aria-labelledby="gt-status-title">
      <div className={`print-only ${s.printHead}`}>
        <strong>{t("corp.name")}</strong>
        <span>{t("gt.printHeading")}</span>
        {printedAt && <span className="small">{t("gt.printedOn", { date: formatDateTime(printedAt.toISOString()) })}</span>}
      </div>
      <div className="card-title">
        <h2 id="gt-status-title">{t("gt.statusTitle", { ref: g.ref })}</h2>
        <button type="button" className="btn btn-outline no-print" onClick={print}>
          <Icon name="printer" size={18} /> {t("gt.print")}
        </button>
      </div>
      <div className="card-body">
        <div className={s.statusRow}>
          <p className={s.statusLine} role="status">
            <span className="muted">{t("gt.currentStatus")}</span>
            <strong id="gt-status" className={`${s.stageBadge} ${s[`badge_${stageKey}`]}`}>{t(`gt.stage.${stageKey}`)}</strong>
          </p>
          {!resolved && (
            <p className={`small muted no-print ${s.checked}`}>
              {checking ? (
                <><Icon name="refresh" size={14} className={s.spin} /> {t("gt.checking")}</>
              ) : checkFailed ? t("gt.checkFailed") : t("gt.lastChecked", { time: clock(checkedAt) })}
            </p>
          )}
        </div>

        <h3 className={s.subhead}>{t("gt.timeline")}</h3>
        <ol className={s.timeline}>
          {STAGES.map((key, k) => {
            const step = g.history.find((h) => h.stage === k);
            const state = k < g.stage ? "done" : k === g.stage ? "current" : "pending";
            return (
              <li key={key} className={`${s.step} ${s[`step_${state}`]}`} aria-current={state === "current" ? "step" : undefined}>
                <span className={s.dot} aria-hidden="true">{state !== "pending" && <Icon name="check" size={12} strokeWidth={3} />}</span>
                <div>
                  <strong>{t(`gt.stage.${key}`)}</strong>
                  <span className="small muted">{step ? ` · ${formatDateTime(step.at)}` : ` · ${t("gt.pending")}`}</span>
                  {step && <p className={`small ${s.stepNote}`}>{noteFor(k)}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        <dl className={s.facts}>
          <div><dt>{t("gr.category")}</dt><dd>{category}</dd></div>
          <div><dt>{t("gr.ward")}</dt><dd>{ward ? pick(ward, lang) : g.ward}</dd></div>
          <div><dt>{t("gt.registeredOn")}</dt><dd>{formatDateTime(g.submittedAt)}</dd></div>
          <div><dt>{t("gr.due")}</dt><dd>{formatDate(g.due)}</dd></div>
          {g.inspectionDate && (
            <div>
              <dt>{t("gt.inspection")}</dt>
              <dd id="gt-inspection">{t("gt.inspectionOn", { date: formatDate(g.inspectionDate), time })}</dd>
              {g.rescheduled && <dd className="small muted">{t("gt.rescheduledNote")}</dd>}
            </div>
          )}
          <div className={s.factWide}><dt>{t("gt.descriptionLabel")}</dt><dd>{g.description}</dd></div>
        </dl>

        {g.stage === STAGE_INSPECTION && <Reschedule record={g} onDone={updated} />}
        {resolved && <Feedback record={g} onDone={updated} />}
      </div>
    </section>
  );
}
