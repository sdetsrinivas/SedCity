"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { registerUser } from "@/mock/endpoints/auth";
import { formatAstheenId, formatMobile, isValidAstheenId, isValidMobile, mobileDigits } from "@/lib/mask";
import type { DictKey } from "@/i18n";
import { TermsIsland } from "./TermsIsland";
import s from "./Auth.module.css";

type Field = "name" | "mobile" | "astheen" | "username" | "password" | "confirm" | "terms";

export function RegisterForm() {
  const { t } = useT();
  const router = useRouter();
  const [v, setV] = useState({ name: "", mobile: "", email: "", astheen: "", username: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, DictKey>>>({});
  const [busy, setBusy] = useState(false);
  const [popover, setPopover] = useState(false);
  const popRef = useRef<HTMLSpanElement>(null);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  // DLG-13: click-to-open popover; closes on outside click or Escape.
  useEffect(() => {
    if (!popover) return;
    const onDoc = (e: MouseEvent) => !popRef.current?.contains(e.target as Node) && setPopover(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPopover(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [popover]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const terms = new FormData(e.currentTarget).get("terms") === "on";
    const errs: Partial<Record<Field, DictKey>> = {};
    if (v.name.trim().length < 3) errs.name = "reg.errName";
    if (!isValidMobile(v.mobile)) errs.mobile = "reg.errMobile";
    if (!isValidAstheenId(v.astheen)) errs.astheen = "reg.errAstheen";
    if (!/^[a-zA-Z0-9._]{4,20}$/.test(v.username)) errs.username = "reg.errUsername";
    if (!/^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(v.password)) errs.password = "reg.errPassword";
    if (v.confirm !== v.password) errs.confirm = "reg.errConfirm";
    if (!terms) errs.terms = "reg.errTerms";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await registerUser({
      username: v.username, password: v.password, role: "citizen", name: v.name.trim(), nameTa: v.name.trim(),
      astheenId: v.astheen, mobile: mobileDigits(v.mobile), email: v.email, ward: "—",
    });
    setBusy(false);
    if (!res.ok) { setErrors({ username: "reg.errTaken" }); return; }
    router.push("/login?reason=registered");
  };

  const err = (f: Field) => errors[f] && <span className="error" id={`err-${f}`}>{t(errors[f]!)}</span>;
  const inv = (f: Field) => (errors[f] ? { "aria-invalid": true as const, "aria-describedby": `err-${f}` } : {});

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      {Object.keys(errors).length > 0 && <div className="alert alert-error" role="alert">{t(Object.values(errors)[0]!)}</div>}
      <div className="field">
        <label htmlFor="reg-name">{t("reg.fullName")}</label>
        <input id="reg-name" className="input" autoComplete="name" value={v.name} onChange={set("name")} {...inv("name")} />
        {err("name")}
      </div>
      <div className={s.grid2}>
        <div className="field">
          <label htmlFor="reg-mobile">{t("reg.mobile")}</label>
          {/* TXT-02: masked input — the value is reformatted on every keystroke to "+91 XXXXX XXXXX". */}
          <input id="reg-mobile" type="tel" className="input" inputMode="numeric" autoComplete="tel-national" placeholder="+91 _____ _____"
            value={v.mobile} onChange={(e) => setV((p) => ({ ...p, mobile: formatMobile(e.target.value) }))} {...inv("mobile")} />
          <span className="help">{t("reg.mobileHelp")}</span>
          {err("mobile")}
        </div>
        <div className="field">
          <label htmlFor="reg-email">{t("reg.email")}</label>
          <input id="reg-email" type="email" className="input" autoComplete="email" value={v.email} onChange={set("email")} />
        </div>
      </div>
      <div className="field">
        <div className={s.inlineHelp}>
          <label htmlFor="reg-astheen">{t("reg.astheenId")}</label>
          <span className={s.popoverHost} ref={popRef}>
            <button type="button" className="link-btn small" aria-expanded={popover} aria-controls="astheen-why" onClick={() => setPopover((p) => !p)}>
              <Icon name="info" size={14} /> {t("reg.astheenWhy")}
            </button>
            {popover && <span id="astheen-why" role="dialog" aria-label={t("reg.astheenWhy")} className={s.popover}>{t("reg.astheenWhyBody")}</span>}
          </span>
        </div>
        <input id="reg-astheen" className="input" placeholder="ASP-____-____-_" value={v.astheen}
          onChange={(e) => setV((p) => ({ ...p, astheen: formatAstheenId(e.target.value) }))} {...inv("astheen")} />
        {err("astheen")}
      </div>
      <div className="field">
        <label htmlFor="reg-username">{t("reg.username")}</label>
        <input id="reg-username" className="input" autoComplete="username" value={v.username} onChange={set("username")} {...inv("username")} />
        <span className="help">{t("reg.usernameHelp")}</span>
        {err("username")}
      </div>
      <div className={s.grid2}>
        <div className="field">
          <label htmlFor="reg-password">{t("reg.password")}</label>
          <input id="reg-password" type="password" className="input" autoComplete="new-password" value={v.password} onChange={set("password")} {...inv("password")} />
          <span className="help">{t("reg.passwordHelp")}</span>
          {err("password")}
        </div>
        <div className="field">
          <label htmlFor="reg-confirm">{t("reg.confirm")}</label>
          <input id="reg-confirm" type="password" className="input" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} {...inv("confirm")} />
          {err("confirm")}
        </div>
      </div>
      <TermsIsland />
      {err("terms")}
      <button type="submit" className={`btn btn-primary btn-block ${s.submit}`} disabled={busy}>
        {busy ? t("reg.submitting") : t("reg.submit")}
      </button>
      <div className={s.linksRow}>
        <span>{t("reg.haveAccount")} <Link href="/login">{t("nav.login")}</Link></span>
      </div>
    </form>
  );
}
