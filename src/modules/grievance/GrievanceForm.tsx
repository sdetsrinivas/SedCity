"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { addDays, formatDate, todayISO } from "@/lib/format";
import { pushSms } from "@/lib/sms";
import { getSession } from "@/lib/session";
import { categoryById, submitGrievance } from "@/mock/endpoints/grievance";
import { wardById } from "@/mock/endpoints/geo";
import { CategorySelect } from "./CategorySelect";
import { WardMap } from "./WardMap";
import { DescriptionEditor } from "./DescriptionEditor";
import { PhotoDrop, type Photo } from "./PhotoDrop";
import { TimePicker } from "./TimePicker";
import { Acknowledgement, type Ack } from "./Acknowledgement";
import { formatTime } from "./time";
import { DESC_MAX, DESC_MIN, EMPTY_DRAFT, validateGrievance, type Errors, type GrievanceDraft } from "./validate";
import s from "./Grievance.module.css";

/** Register a grievance: category, ward (map), description, photos, preferred inspection time, contact. */
export function GrievanceForm() {
  const { t, lang } = useT();
  const [d, setD] = useState<GrievanceDraft>(EMPTY_DRAFT);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ack, setAck] = useState<Ack | null>(null);
  const [round, setRound] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sess = getSession();
    if (sess?.role === "citizen") setD((o) => ({ ...o, name: sess.name, mobile: sess.mobile.replace(/\D/g, "").slice(-10) }));
  }, [round]);

  const set = <K extends keyof GrievanceDraft>(k: K, v: GrievanceDraft[K]) => {
    setD((o) => ({ ...o, [k]: v }));
    setErrors((e) => (k in e ? { ...e, [k]: undefined } : e));
  };

  const submit = async () => {
    const errs = validateGrievance(d);
    setErrors(errs);
    setFailed(false);
    // DLG-01: a missing ward is reported with a native window.alert(), not inline.
    if (!d.ward) {
      window.alert(t("gr.alertNoWard"));
      mapRef.current?.focus();
      return;
    }
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const res = await submitGrievance({
        category: d.category, ward: d.ward, description: d.description.trim(), inspectionTime: d.time,
        photos: photos.map((p) => p.name), name: d.name.trim(), mobile: d.mobile,
      });
      const ref = nextReference("grievance");
      const category = pick(categoryById(d.category)!, lang);
      const ward = pick(wardById(d.ward)!, lang);
      const dueISO = addDays(todayISO(), res.slaDays);
      saveApplication({
        ref, service: "grievance", title: t("gr.appTitle", { category }), submittedAt: new Date().toISOString(),
        status: "Submitted", applicant: d.name.trim(),
        details: {
          category: d.category, ward: d.ward, description: d.description.trim(), inspectionTime: d.time,
          photos: photos.map((p) => p.name).join(", "), mobile: d.mobile, due: dueISO,
        },
      });
      pushSms(d.mobile, t("gr.sms", { ref, date: formatDate(dueISO) }));
      setAck({ ref, category, ward, time: formatTime(d.time, t("gr.am"), t("gr.pm")), photos: photos.length, mobile: d.mobile, dueISO });
      window.scrollTo({ top: 0 });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setD(EMPTY_DRAFT); setPhotos([]); setErrors({}); setAck(null); setRound((r) => r + 1);
  };

  if (ack) return <Acknowledgement ack={ack} onRestart={restart} />;

  const errorList = Object.values(errors).filter(Boolean);
  return (
    <form className={s.form} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {failed && <div className="alert alert-error" role="alert">{t("gr.errSubmit")}</div>}
      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="alert alert-error" role="alert">
          <strong>{t("gr.errSummary")}</strong>
          <ul className={s.errList}>{errorList.map((k) => <li key={k}>{t(k!, { min: DESC_MIN, max: DESC_MAX })}</li>)}</ul>
        </div>
      )}

      <section className={`card ${s.section}`} aria-labelledby="gr-s1">
        <div className="card-title"><h2 id="gr-s1">{t("gr.s1")}</h2></div>
        <div className="card-body">
          <CategorySelect value={d.category} onChange={(v) => set("category", v)} error={errors.category} />
          <WardMap ref={mapRef} value={d.ward} onChange={(v) => set("ward", v)} />
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby="gr-s2">
        <div className="card-title"><h2 id="gr-s2">{t("gr.s2")}</h2></div>
        <div className="card-body">
          <DescriptionEditor key={round} length={d.description.trim().length} onChange={(v) => set("description", v)} error={errors.description} />
          <PhotoDrop photos={photos} onChange={setPhotos} />
          <TimePicker value={d.time} onChange={(v) => set("time", v)} error={errors.time} />
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby="gr-s3">
        <div className="card-title"><h2 id="gr-s3">{t("gr.s3")}</h2></div>
        <div className="card-body">
          <div className={s.contact}>
            <div className="field">
              <label htmlFor="gr-name">{t("gr.name")}</label>
              <input id="gr-name" name="name" className="input" autoComplete="name" value={d.name}
                aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <span className="error">{t(errors.name)}</span>}
            </div>
            <div className="field">
              <label htmlFor="gr-mobile">{t("gr.mobile")}</label>
              <input id="gr-mobile" name="mobile" className="input" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                value={d.mobile} aria-invalid={!!errors.mobile} aria-describedby="gr-mobile-help"
                onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              <span className="help" id="gr-mobile-help">{t("gr.mobileHelp")}</span>
              {errors.mobile && <span className="error">{t(errors.mobile)}</span>}
            </div>
          </div>
          <div className={s.actions}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("gr.submitting") : t("gr.submit")}</button>
          </div>
        </div>
      </section>
    </form>
  );
}
