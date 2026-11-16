"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { delayFor } from "@/mock/api";
import { AmountSlider } from "./AmountSlider";
import { MethodCards } from "./MethodCards";
import { EmailReceipt } from "./EmailReceipt";
import { MIN_PART_PAYMENT, convenienceFee, isEmail, payBounds, type PayMethod } from "./payment";
import s from "./Payment.module.css";

export interface PayChoice {
  amount: number;
  method: PayMethod;
  fee: number;
  email: string | null;
}

/**
 * Payment options for an unpaid bill. BTN-04: a translucent "checking…" overlay covers the whole card,
 * including the enabled "Proceed to pay" button, for PAY_OVERLAY (1.5s) when the card first shows and
 * again after every change of payment method. Clicks during that time land on the overlay.
 */
export function PaymentOptions({ total, notice, onProceed }: { total: number; notice?: string; onProceed: (c: PayChoice) => void }) {
  const { t } = useT();
  const bounds = payBounds(total);
  const [amount, setAmount] = useState(bounds.max);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [emailOn, setEmailOn] = useState(false);
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [overlay, setOverlay] = useState<"check" | "fee" | null>("check");

  useEffect(() => {
    if (!overlay) return;
    const timer = setTimeout(() => setOverlay(null), delayFor("PAY_OVERLAY"));
    return () => clearTimeout(timer);
  }, [overlay, method]);

  const fee = method ? convenienceFee(method, amount) : 0;
  const methodErr = tried && !method;
  const emailErr = tried && emailOn && !isEmail(email);

  const proceed = () => {
    setTried(true);
    if (!method || (emailOn && !isEmail(email))) return;
    onProceed({ amount, method, fee, email: emailOn ? email.trim() : null });
  };

  return (
    <section id="pay-options" className={`card ${s.options}`} aria-labelledby="wt-pay-title" aria-busy={!!overlay}>
      <div className="card-title">
        <h2 id="wt-pay-title">{t("wt.payTitle")}</h2>
      </div>
      <div className={`card-body ${s.optionsBody}`}>
        {notice && <div className="alert alert-info" role="status">{notice}</div>}
        <div className="field">
          <span className="label" id="wt-amount-label">{t("wt.amountToPay")}</span>
          {bounds.min < bounds.max ? (
            <>
              <AmountSlider value={amount} bounds={bounds} onChange={setAmount} />
              <span className="help">{t("wt.amountHelp")}</span>
            </>
          ) : (
            <span className="help">{t("wt.fullOnly", { min: formatINR(MIN_PART_PAYMENT * 2, true) })}</span>
          )}
          <p className={s.paying} id="wt-paying" aria-live="polite">
            {t("wt.payingOf", { amount: formatINR(amount), total: formatINR(bounds.max) })}
            {amount < bounds.max && <> {t("wt.balance", { amount: formatINR(bounds.max - amount) })}</>}
          </p>
        </div>

        <MethodCards
          value={method}
          invalid={methodErr}
          onChange={(m) => {
            if (m === method) return;
            setMethod(m);
            setOverlay("fee");
          }}
        />

        <EmailReceipt on={emailOn} email={email} invalid={emailErr} onToggle={setEmailOn} onEmail={setEmail} />

        <dl className={s.summary}>
          <div><dt>{t("wt.sumAmount")}</dt><dd>{formatINR(amount)}</dd></div>
          <div><dt>{t("wt.sumFee")}</dt><dd>{method ? formatINR(fee) : "—"}</dd></div>
          <div className={s.sumTotal}><dt>{t("wt.sumTotal")}</dt><dd id="wt-charge-total">{formatINR(amount + fee)}</dd></div>
        </dl>

        <button type="button" id="proceed-to-pay" className={`btn btn-accent ${s.proceed}`} onClick={proceed}>
          {t("wt.proceed")}
        </button>
      </div>
      {/* BTN-04: covers the card (and the button) without disabling anything. */}
      {overlay && (
        <div className={s.overlay} role="status">
          <span className={s.overlayMsg}>
            <span className={s.spinner} aria-hidden="true" />
            <span>{t(overlay === "check" ? "wt.overlayCheck" : "wt.overlayFee")}</span>
          </span>
        </div>
      )}
    </section>
  );
}
