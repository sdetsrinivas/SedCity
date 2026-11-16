"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { getSession } from "@/lib/session";
import { store } from "@/mock/store";

const PREF = "water.emailReceipt";

/**
 * CHK-02: native checkbox whose state lives only in the `.checked` property. It is rendered without
 * `checked`/`defaultChecked`, then ticked from script after mount for signed-in residents (or when the
 * saved preference says so). The `checked` attribute is never present, ticked or not.
 */
export function EmailReceipt({
  on, email, invalid, onToggle, onEmail,
}: {
  on: boolean;
  email: string;
  invalid: boolean;
  onToggle: (on: boolean) => void;
  onEmail: (v: string) => void;
}) {
  const { t } = useT();
  const box = useRef<HTMLInputElement>(null);
  const init = useRef({ onToggle, onEmail });

  useEffect(() => {
    const session = getSession();
    const want = store.get<boolean | null>(PREF, null) ?? !!session?.email;
    if (session?.email) init.current.onEmail(session.email);
    if (box.current) box.current.checked = want;
    init.current.onToggle(want);
  }, []);

  return (
    <div className="field">
      <label className="check" htmlFor="emailReceipt">
        <input
          ref={box}
          type="checkbox"
          id="emailReceipt"
          name="emailReceipt"
          onChange={(e) => {
            store.set(PREF, e.target.checked);
            onToggle(e.target.checked);
          }}
        />
        <span>{t("wt.emailReceipt")}</span>
      </label>
      {on && (
        <>
          <label htmlFor="receiptEmail">{t("wt.emailLabel")}</label>
          <input
            id="receiptEmail"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? "receiptEmail-err" : undefined}
          />
          {invalid && <span className="error" id="receiptEmail-err">{t("wt.errEmail")}</span>}
        </>
      )}
    </div>
  );
}
