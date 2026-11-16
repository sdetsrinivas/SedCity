"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import s from "./Auth.module.css";

/**
 * CHK-09 (see TermsIsland). A custom `role=checkbox` button: unlike a native checkbox (whose
 * pre-hydration change React 19 replays), it has no built-in toggle, so until the island hydrates
 * a click does nothing at all. The form reads the hidden `terms` input on submit.
 */
export default function TermsCheckbox() {
  const { t } = useT();
  const [checked, setChecked] = useState(false);
  return (
    <div className={s.termsRow}>
      <button
        type="button"
        id="reg-terms"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby="reg-terms-label"
        className={s.customCheck}
        onClick={() => setChecked((c) => !c)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <input type="hidden" name="terms" value={checked ? "on" : ""} />
      <span id="reg-terms-label">
        {t("reg.terms")} (<Link href="/info/terms" target="_blank">{t("footer.terms")}</Link>)
      </span>
    </div>
  );
}
