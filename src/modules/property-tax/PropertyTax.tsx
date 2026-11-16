"use client";
import { useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { formatINR } from "@/lib/format";
import { createPaySession, getPaySession, type PaySession } from "@/mock/endpoints/astheenpay";
import { localityById, recordTaxPayment, type AssessmentRecord } from "@/mock/endpoints/property";
import { GatewayFrame } from "@/modules/astheenpay/GatewayFrame";
import { convenienceFee } from "@/modules/water/payment";
import { AssessmentField } from "./AssessmentField";
import { LocalitySelect } from "./LocalitySelect";
import { UsageSegments } from "./UsageSegments";
import { AgeSlider } from "./AgeSlider";
import { FloorsTable } from "./FloorsTable";
import { Rebates } from "./Rebates";
import { TaxSummary } from "./TaxSummary";
import { MobilePayBar } from "./MobilePayBar";
import { TaxReceipt } from "./TaxReceipt";
import { AGE_MAX, USAGE_FACTOR, computeTax, halfYearOf, type Floor } from "./tax";
import { validateDraft } from "./validate";
import type { CheckStatus, Draft, ErrorKey } from "./types";
import s from "./PropertyTax.module.css";

type Step =
  | { step: "form"; notice?: string }
  | { step: "gateway"; session: string }
  | { step: "receipt"; receiptNo: string; pay: PaySession };

const USAGE_KEY = { residential: "pt.usageResidential", commercial: "pt.usageCommercial", mixed: "pt.usageMixed" } as const;
let floorSeq = 0;
const toFloors = (rec: AssessmentRecord): Floor[] => rec.floors.map((f) => ({ ...f, id: `r${++floorSeq}` }));

const EMPTY: Draft = {
  assessmentNo: "", check: "idle", record: null, localityId: "", usage: null, age: 10,
  floors: [{ id: "r0", level: 0, area: null, occupancy: "self" }], rebates: [], method: null,
};

/** Property tax self-assessment: verify the assessment, describe the building, review the tax, pay via AstheenPay. */
export function PropertyTax() {
  const { t, lang } = useT();
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<Step>({ step: "form" });
  const summaryRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => ({ ...o, [k]: v }));

  const hy = useMemo(() => halfYearOf(new Date()), []);
  const period = `${hy.fy}/${hy.half}`;
  const periodLabel = t(hy.half === 1 ? "pt.halfFirst" : "pt.halfSecond", { fy: hy.fy });
  const locality = d.localityId ? localityById(d.localityId) : undefined;

  const tax = locality && d.usage && d.floors.some((f) => f.area)
    ? computeTax({ floors: d.floors, baseRate: locality.baseRate, usage: d.usage, age: d.age, rebates: d.rebates })
    : null;
  const uav = tax?.uav ?? null;
  const fee = d.method && tax ? convenienceFee(d.method, tax.payable) : 0;
  const errors = tried ? validateDraft(d) : {};
  const errorList = Object.values(errors) as DictKey[];

  const uavText = locality && d.usage
    ? t("pt.uavTip", {
        locality: pick(locality.name, lang),
        base: formatINR(locality.baseRate),
        usage: t(USAGE_KEY[d.usage]),
        factor: USAGE_FACTOR[d.usage],
      })
    : t("pt.uavTipEmpty");

  const onResult = (check: CheckStatus, record: AssessmentRecord | null) => {
    setD((o) => {
      // A newly found property pre-fills the building details on record; re-verifying the same one keeps the owner's edits.
      if (check === "found" && record && o.record?.no !== record.no) {
        return { ...o, check, record, usage: record.usage, age: Math.min(AGE_MAX, new Date().getFullYear() - record.builtYear), floors: toFloors(record) };
      }
      return { ...o, check, record: check === "found" || check === "paid" ? record : check === "checking" ? o.record : null };
    });
  };

  const proceed = () => {
    setTried(true);
    const errs = validateDraft(d);
    if (Object.keys(errs).length || !tax || !d.method || !d.record) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const session = createPaySession({
      order: { kind: "propertyTax", assessmentNo: d.record.no, half: hy.half, fy: hy.fy },
      amount: tax.payable,
      fee,
      method: d.method,
      email: null,
    });
    setState({ step: "gateway", session: session.id });
  };

  if (state.step === "gateway") {
    return (
      <GatewayFrame
        key={state.session}
        session={state.session}
        onResult={(status) => {
          const pay = getPaySession(state.session);
          if (status !== "paid" || !pay?.txnId || !d.record) {
            setState({ step: "form", notice: t(status === "closed" ? "pt.windowClosed" : "pt.cancelled") });
            return;
          }
          const receiptNo = nextReference("property-tax");
          recordTaxPayment(d.record.no, period, receiptNo);
          saveApplication({
            ref: receiptNo,
            service: "property-tax",
            title: t("pt.appTitle", { no: d.record.no }),
            submittedAt: pay.paidAt!,
            status: "Paid",
            applicant: pick(d.record.owner, lang),
            amount: pay.amount + pay.fee,
            details: { assessmentNo: d.record.no, period, txnId: pay.txnId, amount: formatINR(pay.amount), method: pay.method },
          });
          setState({ step: "receipt", receiptNo, pay });
        }}
      />
    );
  }

  if (state.step === "receipt") {
    return <TaxReceipt receiptNo={state.receiptNo} pay={state.pay} record={d.record!} periodLabel={periodLabel} />;
  }

  const err = (k: ErrorKey) => errors[k];

  return (
    <div className={s.layout}>
      {/* BTN-10: the mobile "Proceed to pay" comes first in the DOM. */}
      <MobilePayBar amount={tax ? tax.payable + fee : null} onProceed={proceed} />
      <div className={s.main}>
        {state.notice && <div className="alert alert-info" role="status">{state.notice}</div>}
        {errorList.length > 0 && (
          <div ref={summaryRef} tabIndex={-1} className="alert alert-error" role="alert">
            <strong>{t("pt.errSummary")}</strong>
            <ul className={s.errList}>{errorList.map((k) => <li key={k}>{t(k)}</li>)}</ul>
          </div>
        )}

        <section className={`card ${s.section}`} aria-labelledby="pt-s1">
          <div className="card-title"><h2 id="pt-s1">{t("pt.s1")}</h2></div>
          <div className="card-body">
            <AssessmentField
              value={d.assessmentNo}
              status={d.check}
              record={d.record}
              period={period}
              periodLabel={periodLabel}
              error={err("assessment")}
              onChange={(v) => setD((o) => ({ ...o, assessmentNo: v, check: "idle" }))}
              onResult={onResult}
            />
            <LocalitySelect value={d.localityId} onChange={(v) => set("localityId", v)} error={err("locality")} />
          </div>
        </section>

        <section className={`card ${s.section}`} aria-labelledby="pt-s2">
          <div className="card-title"><h2 id="pt-s2">{t("pt.s2")}</h2></div>
          <div className="card-body">
            <UsageSegments value={d.usage} onChange={(v) => set("usage", v)} error={err("usage")} />
            <AgeSlider value={d.age} onChange={(v) => set("age", v)} />
          </div>
        </section>

        <section className={`card ${s.section}`} aria-labelledby="pt-s3">
          <div className="card-title"><h2 id="pt-s3">{t("pt.s3")}</h2></div>
          <div className="card-body">
            <p className="small muted" style={{ marginTop: 0 }}>{t("pt.floorsLead")}</p>
            <FloorsTable floors={d.floors} uav={uav} error={err("floors")} onChange={(v) => set("floors", v)} />
          </div>
        </section>

        <section className={`card ${s.section}`} aria-labelledby="pt-rebates-title">
          <div className="card-title"><h2 id="pt-rebates-title">{t("pt.s4")}</h2></div>
          <div className="card-body">
            <p className="small muted" style={{ marginTop: 0 }}>{t("pt.rebatesLead")}</p>
            <Rebates value={d.rebates} onChange={(v) => set("rebates", v)} />
          </div>
        </section>
      </div>

      <TaxSummary
        tax={tax}
        uavText={uavText}
        periodLabel={periodLabel}
        dueISO={hy.dueISO}
        method={d.method}
        fee={fee}
        methodError={err("method")}
        onMethod={(m) => set("method", m)}
        onProceed={proceed}
      />
    </div>
  );
}
