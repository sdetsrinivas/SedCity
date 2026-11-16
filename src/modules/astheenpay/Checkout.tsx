"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import { getSession } from "@/lib/session";
import { pushSms } from "@/lib/sms";
import { delayFor } from "@/mock/api";
import {
  cancelPaySession, loadPaySession, sendPayOtp, verifyPayOtp, type GatewayMessage, type PaySession,
} from "@/mock/endpoints/astheenpay";
import type { DictKey } from "@/i18n";
import { cvvValid, expiryValid, formatExpiry, groupCardNumber, luhnValid, maskCard, nameValid, upiValid } from "./card";
import { FloatingField } from "./FloatingField";
import { OtpModal } from "./OtpModal";
import { GatewayShell as Frame } from "./GatewayShell";
import s from "./AstheenPay.module.css";

/** Mobile number the (fictional) issuing bank has on record when nobody is signed in to the portal. */
const BANK_MOBILE = "9840012345";
const BANKS: DictKey[] = ["ap.bank1", "ap.bank2", "ap.bank3", "ap.bank4"];

type Phase = "loading" | "invalid" | "form" | "sending" | "otp" | "verifying" | "success" | "error";

/** AstheenPay checkout: order summary, method-specific form, OTP, then hands the result back to the merchant page. */
export function Checkout({ sessionId, view }: { sessionId: string; view: "frame" | "window" }) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [pay, setPay] = useState<PaySession | null>(null);
  const [f, setF] = useState({ card: "", name: "", expiry: "", cvv: "", upi: "", bank: "" });
  const [tried, setTried] = useState(false);
  const [wrongOtp, setWrongOtp] = useState(false);
  const mobile = getSession()?.mobile?.replace(/\D/g, "").slice(-10) || BANK_MOBILE;

  // FRM-01 / DLG-15: results go to the hosting page, window.parent in the iframe or window.opener in the popup.
  const post = (msg: Omit<GatewayMessage, "source" | "session">) => {
    const target = view === "window" ? window.opener : window.parent !== window ? window.parent : null;
    (target as Window | null)?.postMessage({ source: "astheenpay", session: sessionId, ...msg } satisfies GatewayMessage, window.location.origin);
  };

  useEffect(() => {
    loadPaySession(sessionId)
      .then((p) => {
        setPay(p);
        setPhase(p && p.status === "pending" ? "form" : "invalid");
      })
      .catch(() => setPhase("error"));
  }, [sessionId]);

  // Keeps the host iframe as tall as the checkout so it never scrolls inside the frame.
  useEffect(() => {
    if (view !== "frame" || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => post({ type: "resize", height: document.documentElement.scrollHeight }));
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [view, sessionId]);

  const finish = (status: "paid" | "cancelled") => {
    post({ type: "result", status });
    if (view === "window") window.close();
  };

  if (phase === "loading") {
    return (
      <Frame>
        <p className={s.connecting} role="status"><span className={s.spinner} aria-hidden="true" /> {t("ap.connecting")}</p>
      </Frame>
    );
  }
  if (phase === "invalid" || phase === "error" || !pay) {
    return (
      <Frame>
        <div className="alert alert-error" role="alert">{t(phase === "error" ? "ap.serviceError" : pay?.status === "paid" ? "ap.done" : "ap.expired")}</div>
      </Frame>
    );
  }

  const total = pay.amount + pay.fee;
  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (pay.method === "card") {
    if (!luhnValid(f.card)) errors.card = t("ap.errCard");
    if (!nameValid(f.name)) errors.name = t("ap.errName");
    if (!expiryValid(f.expiry)) errors.expiry = t("ap.errExpiry");
    if (!cvvValid(f.cvv)) errors.cvv = t("ap.errCvv");
  } else if (pay.method === "upi") {
    if (!upiValid(f.upi)) errors.upi = t("ap.errUpi");
  } else if (!f.bank) errors.bank = t("ap.errBank");
  const err = (k: keyof typeof f) => (tried ? errors[k] : undefined);
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  const submit = async () => {
    setTried(true);
    if (Object.keys(errors).length) return;
    const instrument = pay.method === "card" ? maskCard(f.card) : pay.method === "upi" ? f.upi.trim() : t(f.bank as DictKey);
    setPhase("sending");
    try {
      const otp = await sendPayOtp(pay.id, instrument);
      if (!otp) return setPhase("invalid");
      pushSms(mobile, t("ap.otpSms", { otp, amount: formatINR(total) }), "AD-ASTPAY");
      setWrongOtp(false);
      setPhase("otp");
    } catch {
      setPhase("error");
    }
  };

  const verify = async (otp: string) => {
    setPhase("verifying");
    try {
      const paid = await verifyPayOtp(pay.id, otp);
      if (!paid) {
        setWrongOtp(true);
        setPhase("otp");
        return;
      }
      setPhase("success");
      setTimeout(() => finish("paid"), delayFor("GATEWAY_RETURN"));
    } catch {
      setPhase("error");
    }
  };

  const cancel = () => {
    cancelPaySession(pay.id);
    finish("cancelled");
  };

  if (phase === "success") {
    return (
      <Frame>
        <div className={s.success} role="status">
          <span className={s.tick} aria-hidden="true"><Icon name="check" size={28} /></span>
          <h2>{t("ap.success")}</h2>
          <p>{formatINR(total)}</p>
          <p className="muted">{t("ap.returning")}</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <dl className={s.order}>
        <div><dt>{t("ap.merchant")}</dt><dd>{t("corp.name")}</dd></div>
        <div><dt>{t("ap.purpose")}</dt><dd>{t("ap.forBill", { bill: pay.billNo, consumer: pay.consumerNo })}</dd></div>
        <div><dt>{t("ap.amount")}</dt><dd>{formatINR(pay.amount)}</dd></div>
        <div><dt>{t("ap.fee")}</dt><dd>{formatINR(pay.fee)}</dd></div>
        <div className={s.orderTotal}><dt>{t("ap.total")}</dt><dd>{formatINR(total)}</dd></div>
      </dl>
      <form
        className={s.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 className={s.formTitle}>{t(pay.method === "card" ? "ap.payByCard" : pay.method === "upi" ? "ap.payByUpi" : "ap.payByNet")}</h2>
        {pay.method === "card" && (
          <>
            <FloatingField id="ap-card" label={t("ap.cardNumber")} inputMode="numeric" autoComplete="cc-number" value={f.card} onChange={(e) => set("card")(groupCardNumber(e.target.value))} error={err("card")} />
            <FloatingField id="ap-name" label={t("ap.cardName")} autoComplete="cc-name" value={f.name} onChange={(e) => set("name")(e.target.value)} error={err("name")} />
            <div className={s.row}>
              <FloatingField id="ap-expiry" label={t("ap.expiry")} inputMode="numeric" autoComplete="cc-exp" value={f.expiry} onChange={(e) => set("expiry")(formatExpiry(e.target.value))} error={err("expiry")} />
              <FloatingField id="ap-cvv" label={t("ap.cvv")} type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={3} value={f.cvv} onChange={(e) => set("cvv")(e.target.value.replace(/\D/g, ""))} error={err("cvv")} />
            </div>
          </>
        )}
        {pay.method === "upi" && (
          <FloatingField id="ap-upi" label={t("ap.upiId")} autoComplete="off" autoCapitalize="none" value={f.upi} onChange={(e) => set("upi")(e.target.value)} error={err("upi")} />
        )}
        {pay.method === "netbanking" && (
          <div className="field">
            <label htmlFor="ap-bank">{t("ap.bank")}</label>
            <select id="ap-bank" className="select" value={f.bank} onChange={(e) => set("bank")(e.target.value)} aria-invalid={!!err("bank")}>
              <option value="">{t("ap.bankChoose")}</option>
              {BANKS.map((b) => <option key={b} value={b}>{t(b)}</option>)}
            </select>
            {err("bank") && <span className="error">{err("bank")}</span>}
          </div>
        )}
        <button type="submit" className={`btn btn-primary btn-block ${s.pay}`} disabled={phase === "sending"}>
          <Icon name="lock" size={18} /> {phase === "sending" ? t("ap.sending") : t("ap.pay", { amount: formatINR(total) })}
        </button>
        <button type="button" className={`link-btn ${s.cancel}`} onClick={cancel}>{t("ap.cancel")}</button>
      </form>
      <OtpModal
        open={phase === "otp" || phase === "verifying"}
        last4={mobile.slice(-4)}
        busy={phase === "verifying"}
        wrong={wrongOtp}
        onVerify={verify}
        onCancel={cancel}
      />
    </Frame>
  );
}
