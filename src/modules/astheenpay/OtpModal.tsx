"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { Modal } from "@/components/ui/Modal";

/**
 * DLG-08: the OTP dialog is rendered by the checkout page, so when the checkout runs in the iframe the
 * dialog (and its backdrop) exists only inside the frame's document, centred in the frame, not the page.
 */
export function OtpModal({
  open, last4, busy, wrong, onVerify, onCancel,
}: {
  open: boolean;
  last4: string;
  busy: boolean;
  wrong: boolean;
  onVerify: (otp: string) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [otp, setOtp] = useState("");
  return (
    <Modal
      open={open}
      title={t("ap.otpTitle")}
      dismissible={false}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>{t("ap.cancel")}</button>
          <button type="submit" form="ap-otp-form" className="btn btn-primary" disabled={busy || otp.length !== 6}>
            {busy ? t("ap.verifying") : t("ap.otpVerify")}
          </button>
        </>
      }
    >
      <form
        id="ap-otp-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.length === 6 && !busy) onVerify(otp);
        }}
      >
        <p>{t("ap.otpSent", { last4 })}</p>
        <div className="field">
          <label htmlFor="ap-otp">{t("ap.otpLabel")}</label>
          <input
            id="ap-otp"
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={wrong}
            aria-describedby={wrong ? "ap-otp-err" : undefined}
          />
          {wrong && <span className="error" id="ap-otp-err" role="alert">{t("ap.otpWrong")}</span>}
        </div>
      </form>
    </Modal>
  );
}
