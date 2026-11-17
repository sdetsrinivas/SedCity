"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { pushSms } from "@/lib/sms";
import { getSession } from "@/lib/session";
import { submitTradeApplication, tradeCategoryById, tradeFee } from "@/mock/endpoints/certificates";
import geo from "@/mock/data/geo.json";
import { AddressBlock } from "./AddressBlock";
import { BankDetails } from "./BankDetails";
import { BusinessDetails } from "./BusinessDetails";
import { DocumentsInput } from "./DocumentsInput";
import { FeeBadge } from "./FeeBadge";
import type { ProofMeta } from "./ProofInput";
import { SectionNav } from "./SectionNav";
import { SignaturePad } from "./SignaturePad";
import { TradeAcknowledgement, type TradeAck } from "./TradeAcknowledgement";
import { useLeaveGuard } from "./useLeaveGuard";
import { EMPTY_TRADE, ERROR_VARS, OWNERSHIP, maskAccount, validateTrade, type TradeDraft, type TradeErrors, type TradeField } from "./trade";
import s from "./Certificates.module.css";

const sectionHead = (n: number, title: string) => (
  <div className="card-title"><h2 id={`tl-s${n}`}>{title}</h2></div>
);

/**
 * Trade licence application: one long form in six sections under a sticky section bar (DYN-09).
 * Unsaved changes are guarded by a beforeunload prompt (DLG-04).
 */
export function TradeForm() {
  const { t, lang } = useT();
  const [d, setD] = useState<TradeDraft>(EMPTY_TRADE);
  const [docs, setDocs] = useState<ProofMeta[]>([]);
  const [signature, setSignature] = useState(0);
  const [errors, setErrors] = useState<TradeErrors>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ack, setAck] = useState<TradeAck | null>(null);
  const [round, setRound] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // DLG-04: only while something has been entered and not yet submitted.
  useLeaveGuard(dirty && !ack);

  useEffect(() => {
    const sess = getSession();
    if (sess?.role === "citizen") setD((o) => ({ ...o, ownerName: sess.name, mobile: sess.mobile.replace(/\D/g, "").slice(-10), email: sess.email }));
  }, [round]);

  const touch = (...keys: TradeField[]) => {
    setDirty(true);
    setErrors((e) => (keys.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k as TradeField))) : e));
  };
  const set = <K extends keyof TradeDraft>(k: K, v: TradeDraft[K]) => {
    setD((o) => ({ ...o, [k]: v }));
    touch(k as TradeField);
  };
  const error = (k: TradeField) => (errors[k] ? t(errors[k]!, ERROR_VARS) : undefined);
  const err = (k: TradeField) => {
    const m = error(k);
    return m ? <span className="error" id={`tl-${k}-error`}>{m}</span> : null;
  };

  const submit = async () => {
    const errs = validateTrade(d, { documents: docs.length, signature });
    setErrors(errs);
    setFailed(false);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const area = Number(d.area);
      const res = await submitTradeApplication({
        businessName: d.businessName.trim(), category: d.category, area, ward: d.ward, ownership: d.ownership,
        ownerName: d.ownerName.trim(), mobile: d.mobile, documents: docs.map((f) => f.name),
        accountLast4: d.account.slice(-4), signed: true,
      });
      const ref = nextReference("trade");
      const fee = res.fee ?? tradeFee(d.category, area)!;
      const category = pick(tradeCategoryById(d.category)!, lang);
      const ward = pick(geo.wards.find((w) => w.id === d.ward)!, lang);
      saveApplication({
        ref, service: "trade", title: t("tl.appTitle", { name: d.businessName.trim() }), submittedAt: new Date().toISOString(),
        status: "Submitted", applicant: d.ownerName.trim(), amount: fee,
        details: {
          businessName: d.businessName.trim(), category: d.category, area: String(area),
          premises: `${d.premises.line.trim()} ${d.premises.pin}`, ward: d.ward, ownership: d.ownership,
          ownerName: d.ownerName.trim(), mobile: d.mobile, email: d.email.trim(),
          residence: `${d.residence.line.trim()} ${d.residence.pin}`,
          documents: docs.map((f) => f.name).join(", "), account: maskAccount(d.account), ifsc: d.ifsc,
          signature: canvasRef.current?.toDataURL("image/png") ?? "",
        },
      });
      pushSms(d.mobile, t("tl.sms", { ref, name: d.businessName.trim(), days: res.inspectionInDays }));
      setAck({
        ref, businessName: d.businessName.trim(), category, ward, fee, documents: docs.length,
        account: maskAccount(d.account), mobile: d.mobile, inspectionInDays: res.inspectionInDays,
      });
      setDirty(false);
      window.scrollTo({ top: 0 });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setD(EMPTY_TRADE); setDocs([]); setSignature(0); setErrors({}); setDirty(false); setAck(null); setRound((r) => r + 1);
  };

  if (ack) return <TradeAcknowledgement ack={ack} onRestart={restart} />;

  const errorKeys = (Object.keys(errors) as TradeField[]).filter((k) => errors[k]);
  return (
    <div className={s.form} key={round}>
      <SectionNav />
      {failed && <div className="alert alert-error" role="alert">{t("tl.errSubmit")}</div>}
      {errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="alert alert-error" role="alert">
          <strong>{t("tl.errSummary")}</strong>
          <ul className={s.errList}>{errorKeys.map((k) => <li key={k}>{error(k)}</li>)}</ul>
        </div>
      )}

      <form aria-label={t("tl.formName")} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <section id="tl-sec-1" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s1">
          {sectionHead(1, t("tl.s1"))}
          <div className="card-body"><BusinessDetails draft={d} set={set} error={error} /></div>
        </section>

        <section id="tl-sec-2" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s2">
          {sectionHead(2, t("tl.s2"))}
          <div className="card-body">
            <AddressBlock legend={t("tl.premisesLegend")} value={d.premises}
              onChange={(v) => { setD((o) => ({ ...o, premises: v })); touch("premisesLine", "premisesPin"); }}
              lineError={error("premisesLine")} pinError={error("premisesPin")} />
            <div className="field">
              <label htmlFor="tl-ward">{t("tl.ward")}</label>
              <select id="tl-ward" name="ward" className={`select ${s.wide}`} value={d.ward} aria-invalid={!!errors.ward}
                onChange={(e) => set("ward", e.target.value)}>
                <option value="">{t("tl.wardChoose")}</option>
                {geo.wards.map((w) => <option key={w.id} value={w.id}>{pick(w, lang)}</option>)}
              </select>
              {err("ward")}
            </div>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>{t("tl.ownership")}</legend>
              <div className={s.inlineRadios}>
                {OWNERSHIP.map((o) => (
                  <label key={o.v} className="check">
                    <input type="radio" name="ownership" value={o.v} checked={d.ownership === o.v} onChange={() => set("ownership", o.v)} />
                    {t(o.label)}
                  </label>
                ))}
              </div>
              {err("ownership")}
            </fieldset>
          </div>
        </section>

        <section id="tl-sec-3" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s3">
          {sectionHead(3, t("tl.s3"))}
          <div className="card-body">
            <div className="field">
              <label htmlFor="tl-owner">{t("tl.ownerName")}</label>
              <input id="tl-owner" name="ownerName" className={`input ${s.wide}`} autoComplete="name" value={d.ownerName}
                aria-invalid={!!errors.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
              {err("ownerName")}
            </div>
            <div className={s.pair}>
              <div className="field">
                <label htmlFor="tl-mobile">{t("tl.mobile")}</label>
                <input id="tl-mobile" name="mobile" className="input" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                  value={d.mobile} aria-invalid={!!errors.mobile} aria-describedby="tl-mobile-help"
                  onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                <span className="help" id="tl-mobile-help">{t("tl.mobileHelp")}</span>
                {err("mobile")}
              </div>
              <div className="field">
                <label htmlFor="tl-email">{t("tl.email")}</label>
                <input id="tl-email" name="email" type="email" className="input" autoComplete="email" value={d.email}
                  aria-invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
                {err("email")}
              </div>
            </div>
            <AddressBlock legend={t("tl.residenceLegend")} value={d.residence}
              onChange={(v) => { setD((o) => ({ ...o, residence: v })); touch("residenceLine", "residencePin"); }}
              lineError={error("residenceLine")} pinError={error("residencePin")} />
          </div>
        </section>

        <section id="tl-sec-4" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s4">
          {sectionHead(4, t("tl.s4"))}
          <div className="card-body">
            <DocumentsInput value={docs} onChange={(f) => { setDocs(f); touch("documents"); }} error={error("documents")} />
          </div>
        </section>

        <section id="tl-sec-5" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s5">
          {sectionHead(5, t("tl.s5"))}
          <div className="card-body"><BankDetails draft={d} set={set} error={error} /></div>
        </section>

        <section id="tl-sec-6" className={`card ${s.section} ${s.anchor}`} aria-labelledby="tl-s6">
          {sectionHead(6, t("tl.s6"))}
          <div className="card-body">
            <div className={s.badgeWrap}><FeeBadge category={d.category} area={d.area} /></div>
            <SignaturePad canvasRef={canvasRef} onChange={(len) => { setSignature(len); touch("signature"); }} error={error("signature")} />
            <div className="field">
              <label className="check">
                <input type="checkbox" name="declared" checked={d.declared} aria-invalid={!!errors.declared}
                  onChange={(e) => set("declared", e.target.checked)} />
                <span>{t("tl.declaration")}</span>
              </label>
              {err("declared")}
            </div>
            <div className={s.actions}>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("tl.submitting") : t("tl.submit")}</button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
