"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { checkCredentials, sendOtp, verifyOtp, type UserRecord } from "@/mock/endpoints/auth";
import { encodeToken, newChallenge, verifyCaptcha, type Challenge } from "@/lib/captcha";
import { maskMobile } from "@/lib/mask";
import { pushSms } from "@/lib/sms";
import { setSession, type Role } from "@/lib/session";
import { Captcha } from "./Captcha";
import s from "./Auth.module.css";

type SafeUser = Omit<UserRecord, "password">;

export function LoginForm({ next }: { next?: string }) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();

  const [role, setRole] = useState<Role>("citizen");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [answer, setAnswer] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpUser, setOtpUser] = useState<SafeUser | null>(null);
  const [otp, setOtp] = useState("");
  const keepRef = useRef<HTMLInputElement>(null);
  const keepSignedIn = useRef(true);

  const refreshCaptcha = useCallback(() => { setChallenge(newChallenge()); setAnswer(""); }, []);
  useEffect(() => { refreshCaptcha(); }, [refreshCaptcha]);
  const token = challenge ? encodeToken(challenge) : "";

  // BTN-06: Sign in stays disabled until username, a 6+ char password and a captcha answer are present.
  const canSubmit = username.trim().length > 0 && password.length >= 6 && answer.trim().length > 0 && !busy;

  const deliverOtp = async (user: SafeUser) => {
    const { otp: code, mobile } = await sendOtp(user.username);
    pushSms(mobile, t("login.otpSms", { otp: code }));
    // DLG-09: the OTP is shown in a toast that removes itself after ~3s (TOAST_TTL).
    toast({ title: t("login.otpToast", { mobile: maskMobile(mobile) }), message: `OTP: ${code}`, tone: "info" });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const formToken = new FormData(e.currentTarget).get("captcha_token") as string;
    if (!verifyCaptcha(formToken, answer)) {
      setError(t("login.errCaptcha"));
      refreshCaptcha();
      return;
    }
    setBusy(true);
    try {
      const res = await checkCredentials(username, password, role);
      if (!res.ok) {
        setError(res.reason === "role" ? t("login.errRole") : t("login.errInvalid"));
        refreshCaptcha();
        return;
      }
      // CHK-01: read the live .checked property — the `checked` attribute never changes after SSR.
      keepSignedIn.current = keepRef.current?.checked ?? true;
      await deliverOtp(res.user);
      setOtpUser(res.user);
    } catch {
      setError(t("login.errInvalid"));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpUser) return;
    setBusy(true);
    setError(null);
    const ok = await verifyOtp(otpUser.username, otp);
    setBusy(false);
    if (!ok) { setError(t("login.otpInvalid")); return; }
    setSession({
      username: otpUser.username, name: otpUser.name, nameTa: otpUser.nameTa, role: otpUser.role,
      astheenId: otpUser.astheenId, mobile: otpUser.mobile, email: otpUser.email, ward: otpUser.ward,
      loginAt: new Date().toISOString(), keepSignedIn: keepSignedIn.current,
    });
    const fallback = otpUser.role === "officer" ? "/officer/queue" : "/dashboard";
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : fallback);
  };

  if (otpUser) {
    return (
      <form className={s.form} onSubmit={onVerify} noValidate>
        <h2 className={s.formTitle}>{t("login.otpTitle")}</h2>
        <p className="muted">{t("login.otpSent")} <strong>{maskMobile(otpUser.mobile)}</strong></p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="otp">{t("login.otpLabel")}</label>
          <input id="otp" name="otp" className={`input ${s.otpInput}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={otp.length !== 6 || busy}>
          {busy ? t("login.checking") : t("login.otpVerify")}
        </button>
        <div className={s.linksRow}>
          <button type="button" className="link-btn" disabled={busy} onClick={() => deliverOtp(otpUser)}>{t("login.otpResend")}</button>
          <Link href="/messages" target="_blank">{t("nav.messages")}</Link>
          <button type="button" className="link-btn" onClick={() => { setOtpUser(null); setOtp(""); setPassword(""); refreshCaptcha(); }}>{t("login.otpBack")}</button>
        </div>
      </form>
    );
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      {/* OTH-26: role switch (Citizen / Officer) */}
      <div className={s.roleTabs} role="tablist" aria-label={t("login.roleLabel")}>
        {(["citizen", "officer"] as Role[]).map((r) => (
          <button key={r} type="button" role="tab" aria-selected={role === r} className={role === r ? s.roleActive : undefined}
            onClick={() => { setRole(r); setError(null); }}>
            <Icon name={r === "citizen" ? "user" : "users"} size={16} /> {r === "citizen" ? t("login.roleCitizen") : t("login.roleOfficer")}
          </button>
        ))}
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {/* TXT-01: plain, well-labelled text input */}
      <div className="field">
        <label htmlFor="username">{role === "officer" ? t("login.employeeUsername") : t("login.username")}</label>
        <input id="username" name="username" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">{t("login.password")}</label>
        <div className={s.pwWrap}>
          <input id="password" name="password" type={showPw ? "text" : "password"} className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className={s.pwToggle} aria-label={showPw ? t("login.hidePassword") : t("login.showPassword")} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>
            <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
          </button>
        </div>
      </div>
      <div className="field">
        <span className="label" id="captcha-label">{t("login.captcha")}</span>
        <Captcha challenge={challenge} token={token} onRefresh={refreshCaptcha} />
        <label htmlFor="captcha-answer" className="sr-only">{t("login.captchaAnswer")}</label>
        <input id="captcha-answer" name="captcha" className={`input ${s.captchaInput}`} inputMode="numeric" placeholder={t("login.captchaAnswer")} aria-describedby="captcha-label"
          value={answer} onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))} />
      </div>
      {/* CHK-01: uncontrolled native checkbox; SSR renders the `checked` attribute and it never changes afterwards. */}
      <label className="check" htmlFor="keep-signed-in">
        <input ref={keepRef} id="keep-signed-in" name="keep" type="checkbox" defaultChecked />
        {t("login.keepSignedIn")}
      </label>
      <button type="submit" className={`btn btn-primary btn-block ${s.submit}`} disabled={!canSubmit}>
        {busy ? t("login.checking") : t("login.submit")}
      </button>
      <div className={s.linksRow}>
        <Link href="/help">{t("login.forgot")}</Link>
        <span>{t("login.noAccount")} <Link href="/register">{t("login.createAccount")}</Link></span>
      </div>
    </form>
  );
}
