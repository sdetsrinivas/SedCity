"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { formatINR, todayISO } from "@/lib/format";
import { pushSms } from "@/lib/sms";
import { getSession } from "@/lib/session";
import { hospitalById, submitBirthApplication } from "@/mock/endpoints/certificates";
import { ChildDetails } from "./ChildDetails";
import { ApplicantDetails } from "./ApplicantDetails";
import { DeliveryForm } from "./DeliveryForm";
import { BirthAcknowledgement, type BirthAck } from "./BirthAcknowledgement";
import type { ProofMeta } from "./ProofInput";
import { useLeaveGuard } from "./useLeaveGuard";
import { DELIVERY_MODES, EMPTY_BIRTH, ERROR_VARS, OTHER_PLACE, birthFee, validateBirth, type BirthDraft, type BirthErrors, type BirthField } from "./birth";
import s from "./Certificates.module.css";

/**
 * Birth certificate application. Sections 1–3 are one <form>; delivery (section 4) is a second
 * <form> beside it (RAD-04). Unsaved changes are guarded by a beforeunload prompt (DLG-04).
 */
export function BirthForm() {
  const { t, lang } = useT();
  const [d, setD] = useState<BirthDraft>(EMPTY_BIRTH);
  const [proof, setProof] = useState<ProofMeta | null>(null);
  const [errors, setErrors] = useState<BirthErrors>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ack, setAck] = useState<BirthAck | null>(null);
  const [round, setRound] = useState(0);
  const [today, setToday] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // DLG-04: only while something has been entered and not yet submitted.
  useLeaveGuard(dirty && !ack);

  useEffect(() => {
    setToday(todayISO());
    const sess = getSession();
    if (sess?.role === "citizen") setD((o) => ({ ...o, applicantName: sess.name, mobile: sess.mobile.replace(/\D/g, "").slice(-10), email: sess.email }));
  }, [round]);

  const set = <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => {
    setD((o) => ({ ...o, [k]: v }));
    setDirty(true);
    setErrors((e) => (k in e ? { ...e, [k]: undefined } : e));
  };
  const onProof = (f: ProofMeta | null) => {
    setProof(f);
    setDirty(true);
    setErrors((e) => ("proof" in e ? { ...e, proof: undefined } : e));
  };
  const error = (k: BirthField) => (errors[k] ? t(errors[k]!, ERROR_VARS) : undefined);

  const submit = async () => {
    const now = todayISO();
    const errs = validateBirth(d, !!proof, now);
    setErrors(errs);
    setFailed(false);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const copies = Number(d.copies);
      const res = await submitBirthApplication({
        childName: d.childName.trim(), sex: d.sex, dob: d.dob, hospital: d.hospital, place: d.place.trim(),
        motherName: d.motherName.trim(), fatherName: d.fatherName.trim(), applicantType: d.applicantType,
        applicantName: d.applicantName.trim(), mobile: d.mobile, proof: proof!.name, delivery: d.delivery, copies,
      });
      const ref = nextReference("birth");
      const fee = birthFee(d.copies, d.delivery);
      const place = d.hospital === OTHER_PLACE ? d.place.trim() : pick(hospitalById(d.hospital)!, lang);
      const delivery = t(DELIVERY_MODES.find((m) => m.v === d.delivery)!.label);
      saveApplication({
        ref, service: "birth", title: t("bc.appTitle", { name: d.childName.trim() }), submittedAt: new Date().toISOString(),
        status: "Submitted", applicant: d.applicantName.trim(), amount: fee,
        details: {
          childName: d.childName.trim(), sex: d.sex, dob: d.dob, hospital: d.hospital, place: d.place.trim(),
          motherName: d.motherName.trim(), fatherName: d.fatherName.trim(), applicantType: d.applicantType,
          mobile: d.mobile, proof: proof!.name, delivery: d.delivery, address: d.delivery === "2" ? `${d.address.trim()} ${d.pin}` : "",
          email: d.delivery === "3" ? d.email.trim() : "", copies: String(copies),
        },
      });
      pushSms(d.mobile, t("bc.sms", { ref, fee: formatINR(fee), days: res.readyInDays }));
      setAck({ ref, childName: d.childName.trim(), dob: d.dob, place, delivery, copies, fee, mobile: d.mobile, readyInDays: res.readyInDays });
      setDirty(false);
      window.scrollTo({ top: 0 });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setD(EMPTY_BIRTH); setProof(null); setErrors({}); setDirty(false); setAck(null); setRound((r) => r + 1);
  };

  if (ack) return <BirthAcknowledgement ack={ack} onRestart={restart} />;

  const errorKeys = (Object.keys(errors) as BirthField[]).filter((k) => errors[k]);
  return (
    <div className={s.form} key={round}>
      {failed && <div className="alert alert-error" role="alert">{t("bc.errSubmit")}</div>}
      {errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="alert alert-error" role="alert">
          <strong>{t("bc.errSummary")}</strong>
          <ul className={s.errList}>{errorKeys.map((k) => <li key={k}>{error(k)}</li>)}</ul>
        </div>
      )}

      <form aria-label={t("bc.formName")} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <section className={`card ${s.section}`} aria-labelledby="bc-s1">
          <div className="card-title"><h2 id="bc-s1">{t("bc.s1")}</h2></div>
          <div className="card-body">
            <ChildDetails draft={d} set={set} error={error} today={today} />
          </div>
        </section>

        <section className={`card ${s.section}`} aria-labelledby="bc-s2">
          <div className="card-title"><h2 id="bc-s2">{t("bc.s2")}</h2></div>
          <div className="card-body">
            <div className={s.pair}>
              <div className="field">
                <label htmlFor="bc-mother">{t("bc.mother")}</label>
                <input id="bc-mother" name="motherName" className="input" autoComplete="off" value={d.motherName}
                  aria-invalid={!!errors.motherName} onChange={(e) => set("motherName", e.target.value)} />
                {errors.motherName && <span className="error">{error("motherName")}</span>}
              </div>
              <div className="field">
                <label htmlFor="bc-father">{t("bc.father")}</label>
                <input id="bc-father" name="fatherName" className="input" autoComplete="off" value={d.fatherName}
                  aria-describedby="bc-father-help" onChange={(e) => set("fatherName", e.target.value)} />
                <span className="help" id="bc-father-help">{t("bc.fatherHelp")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`card ${s.section}`} aria-labelledby="bc-s3">
          <div className="card-title"><h2 id="bc-s3">{t("bc.s3")}</h2></div>
          <div className="card-body">
            <ApplicantDetails draft={d} set={set} error={error} proof={proof} onProof={onProof} />
          </div>
        </section>
      </form>

      <DeliveryForm draft={d} set={set} error={error} busy={busy} onSubmit={() => void submit()} />
    </div>
  );
}
