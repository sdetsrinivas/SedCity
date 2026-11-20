"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { Session } from "@/lib/session";
import { saveEmail } from "@/mock/endpoints/dashboard";
import s from "./Dashboard.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const spacedMobile = (m: string) => `${m.slice(0, 5)} ${m.slice(5)}`;

/**
 * TXT-08: three fields that look alike but are locked in three different ways.
 * - Astheen ID: `readonly`: focusable, selectable, submitted, but typing does nothing.
 * - Registered mobile: `disabled`: not focusable, not submitted, greyed by the browser.
 * - Email: `aria-disabled="true"` only. The input is a normal, enabled, focusable control (WebDriver's
 *   isEnabled() is true), but it is controlled and ignores every change until “Change email” is pressed,
 *   so typed text snaps back. Playwright treats aria-disabled as disabled: fill() waits until it times out.
 * Save email goes through PROFILE_SAVE (1s).
 */
export function ContactForm({ session, email, onSaved }: { session: Session; email: string; onSaved: (e: string) => void }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const shown = editing ? value : email;

  const start = () => {
    setValue(email);
    setEditing(true);
    setError(null);
    setNote("");
    requestAnimationFrame(() => input.current?.select());
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || busy) return;
    if (!EMAIL.test(value.trim())) { setError(t("dash.pf.emailInvalid")); input.current?.focus(); return; }
    setBusy(true);
    try {
      await saveEmail(session.username, value);
      onSaved(value.trim());
      setEditing(false);
      setNote(t("dash.pf.saved"));
    } catch {
      setError(t("dash.pf.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={s.contact} onSubmit={save} noValidate>
      <div className="field">
        <label htmlFor="pf-astheen-id">{t("dash.pf.astheenId")}</label>
        <input id="pf-astheen-id" name="astheenId" className="input" readOnly value={session.astheenId} />
      </div>
      <div className="field">
        <label htmlFor="pf-mobile">{t("dash.pf.mobile")}</label>
        <input id="pf-mobile" name="mobile" className="input" disabled value={spacedMobile(session.mobile)} aria-describedby="pf-mobile-help" />
        <span id="pf-mobile-help" className="help">{t("dash.pf.mobileHelp")}</span>
      </div>
      <div className="field">
        <label htmlFor="pf-email">{t("dash.pf.email")}</label>
        <input
          ref={input}
          id="pf-email"
          name="email"
          type="email"
          className={`input ${editing ? "" : s.locked}`}
          autoComplete="email"
          aria-disabled={!editing}
          aria-invalid={!!error}
          aria-describedby={error ? "pf-email-error" : undefined}
          value={shown}
          onChange={(e) => { if (editing) { setValue(e.target.value); setError(null); } }}
        />
        {error && <span id="pf-email-error" className="error">{error}</span>}
      </div>
      <div className={s.contactActions}>
        {editing ? (
          <>
            <button key="save" type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("dash.pf.saving") : t("dash.pf.save")}</button>
            <button key="cancel" type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setEditing(false); setError(null); }}>{t("dash.pf.cancel")}</button>
          </>
        ) : (
          // Keyed apart from Save: if React reused this element as the submit button, the click that
          // started editing would also submit the form (its default action runs after the re-render).
          <button key="change" type="button" className="btn btn-outline" onClick={start}>{t("dash.pf.change")}</button>
        )}
      </div>
      <p className="small muted" role="status">{note}</p>
    </form>
  );
}
