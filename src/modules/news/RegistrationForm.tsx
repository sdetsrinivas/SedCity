"use client";
import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { MAX_ATTENDEES, validateRegistration, type RegistrationErrors, type RegistrationInput } from "./registration";
import s from "./News.module.css";

interface Props {
  seatsLeft: number | null;
  defaults: { name: string; mobile: string };
  onCancel: () => void;
  /** Resolves false when the seats ran out in the meantime. */
  onSubmit: (input: RegistrationInput) => Promise<boolean>;
}

export function RegistrationForm({ seatsLeft, defaults, onCancel, onSubmit }: Props) {
  const { t } = useT();
  const [name, setName] = useState(defaults.name);
  const [mobile, setMobile] = useState(defaults.mobile);
  const [attendees, setAttendees] = useState(1);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [failure, setFailure] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = { name, mobile, attendees };
    const found = validateRegistration(input, seatsLeft);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      if (!(await onSubmit(input))) setFailure("ev.errSeats");
    } catch {
      setFailure("ev.errSubmit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className={s.regForm}>
      {failure && <div className="alert alert-error" role="alert">{t(failure)}</div>}
      <div className="field">
        <label htmlFor="ev-name">{t("ev.name")}</label>
        <input id="ev-name" name="name" className="input" autoComplete="name" value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <span className="error">{t(errors.name)}</span>}
      </div>
      <div className="field">
        <label htmlFor="ev-mobile">{t("ev.mobile")}</label>
        <input id="ev-mobile" name="mobile" className="input" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={mobile} aria-invalid={!!errors.mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
        {errors.mobile && <span className="error">{t(errors.mobile)}</span>}
      </div>
      <div className="field">
        <label htmlFor="ev-attendees">{t("ev.attendees")}</label>
        <select id="ev-attendees" name="attendees" className={`select ${s.attendees}`} value={attendees} onChange={(e) => setAttendees(Number(e.target.value))}>
          {Array.from({ length: MAX_ATTENDEES }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {errors.attendees && <span className="error">{t(errors.attendees, { most: MAX_ATTENDEES })}</span>}
      </div>
      <div className={s.regActions}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>{t("ev.cancel")}</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{t(busy ? "ev.registering" : "ev.confirm")}</button>
      </div>
    </form>
  );
}
