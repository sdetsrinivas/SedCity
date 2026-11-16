"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { delayFor } from "@/mock/api";
import { store } from "@/mock/store";
import { submitElectricity } from "@/mock/endpoints/electricity";
import { nextReference, saveApplication } from "@/lib/applications";
import { formatDate } from "@/lib/format";
import { mobileDigits, formatMobile } from "@/lib/mask";
import { pushSms } from "@/lib/sms";
import { getSession } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { StepConnection } from "./StepConnection";
import { StepApplicant } from "./StepApplicant";
import { StepPremises } from "./StepPremises";
import { StepDocuments, inspectionRange } from "./StepDocuments";
import { StepReview } from "./StepReview";
import { Confirmation } from "./Confirmation";
import { STEP_COUNT, validateStep } from "./validate";
import { EMPTY_DRAFT, type Draft, type Errors } from "./types";
import s from "./Electricity.module.css";

const STEPS: DictKey[] = ["el.step1", "el.step2", "el.step3", "el.step4", "el.step5"];
const DRAFT_KEY = "draft.electricity";

export function Wizard() {
  const { t } = useT();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [declared, setDeclared] = useState(false);
  const [entering, setEntering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; date: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Restore a draft from this tab, otherwise prefill from the signed-in citizen.
  useEffect(() => {
    const saved = store.get<{ draft: Draft; step: number; maxReached: number } | null>(DRAFT_KEY, null, "session");
    if (saved) { setDraft(saved.draft); setStep(saved.step); setMaxReached(saved.maxReached); return; }
    const sess = getSession();
    if (sess?.role === "citizen") {
      setDraft((d) => ({ ...d, name: sess.name, astheenId: sess.astheenId, mobile: formatMobile(sess.mobile), email: sess.email }));
    }
  }, []);
  useEffect(() => {
    if (!done) store.set(DRAFT_KEY, { draft, step, maxReached }, "session");
  }, [draft, step, maxReached, done]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  }, []);

  // DYN-04: each new step slides in over STEP_ANIMATION (450ms). During the animation the panel is
  // in the DOM and visible but has pointer-events:none, so clicks fall through to nothing.
  const goTo = useCallback((n: number) => {
    setStep(n);
    setErrors({});
    setEntering(true);
    window.history.replaceState(null, "", `?step=${n}`);
  }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest" });
    if (!entering) return;
    const id = setTimeout(() => setEntering(false), delayFor("STEP_ANIMATION") + 60);
    return () => clearTimeout(id);
  }, [step, entering]);

  const next = async () => {
    const errs = validateStep(step, draft, inspectionRange(), declared);
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
    if (step < STEP_COUNT) {
      setMaxReached((m) => Math.max(m, step + 1));
      goTo(step + 1);
      return;
    }
    setBusy(true);
    await submitElectricity(draft);
    const ref = nextReference("electricity");
    saveApplication({
      ref, service: "electricity", title: t("el.title"), submittedAt: new Date().toISOString(), status: "Submitted",
      applicant: draft.name, details: { connType: draft.connType, load: `${draft.load} kW`, inspection: draft.inspectionDate },
    });
    pushSms(mobileDigits(draft.mobile), t("el.sms", { ref, date: formatDate(draft.inspectionDate) }));
    store.remove(DRAFT_KEY, "session");
    setBusy(false);
    setDone({ ref, date: draft.inspectionDate });
    window.history.replaceState(null, "", window.location.pathname);
  };

  const restart = () => {
    setDraft(EMPTY_DRAFT); setDeclared(false); setDone(null); setMaxReached(1); goTo(1);
  };

  if (done) return <div className="card card-body"><Confirmation refNo={done.ref} inspectionDate={done.date} onRestart={restart} /></div>;

  const hasErrors = Object.values(errors).some(Boolean);
  const animMs = delayFor("STEP_ANIMATION");
  return (
    <div className={s.wizard}>
      <ol className={s.stepper} aria-label={t("el.stepOf", { n: step, total: STEP_COUNT })}>
        {STEPS.map((k, i) => {
          const n = i + 1;
          const state = n === step ? s.current : n < step || n <= maxReached ? s.visited : "";
          return (
            <li key={k} className={`${s.stepItem} ${state}`} aria-current={n === step ? "step" : undefined}>
              {n !== step && n <= maxReached ? (
                <button type="button" className={s.stepBtn} onClick={() => goTo(n)}>
                  <span className={s.stepNum}>{n < step ? <Icon name="check" size={14} /> : n}</span><span className={s.stepLabel}>{t(k)}</span>
                </button>
              ) : (
                <span className={s.stepBtn}><span className={s.stepNum}>{n}</span><span className={s.stepLabel}>{t(k)}</span></span>
              )}
            </li>
          );
        })}
      </ol>

      <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); next(); }}>
        <div key={step} className={`card-body ${s.panel} ${entering ? s.entering : ""}`} style={{ animationDuration: `${animMs}ms` }}
          onAnimationEnd={() => setEntering(false)}>
          <p className="small muted" style={{ margin: 0 }}>{t("el.stepOf", { n: step, total: STEP_COUNT })}</p>
          <h2 ref={headingRef} tabIndex={-1} className={s.stepTitle}>{step === STEP_COUNT ? t("el.review") : t(STEPS[step - 1])}</h2>
          {hasErrors && <div className="alert alert-error" role="alert">{t("el.errSummary")}</div>}
          {step === 1 && <StepConnection draft={draft} set={set} errors={errors} />}
          {step === 2 && <StepApplicant draft={draft} set={set} errors={errors} />}
          {step === 3 && <StepPremises draft={draft} set={set} errors={errors} />}
          {step === 4 && <StepDocuments draft={draft} set={set} errors={errors} />}
          {step === 5 && <StepReview draft={draft} goTo={goTo} declared={declared} setDeclared={(v) => { setDeclared(v); setErrors({}); }} errors={errors} />}
          <div className={s.actions}>
            {step > 1 ? <button type="button" className="btn btn-outline" onClick={() => goTo(step - 1)}><Icon name="chevronLeft" size={16} /> {t("el.back")}</button> : <span />}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {step === STEP_COUNT ? (busy ? t("el.submitting") : t("el.submit")) : <>{t("el.next")} <Icon name="chevronRight" size={16} /></>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
