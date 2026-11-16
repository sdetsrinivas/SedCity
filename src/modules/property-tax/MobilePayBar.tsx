"use client";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import s from "./PropertyTax.module.css";

/**
 * BTN-10: a second "Proceed to pay" in a bar fixed to the bottom of small screens. It is rendered
 * *before* the desktop button in the DOM and hidden with `display:none` above 900px, while the desktop
 * button is hidden below 900px. Both are always in the DOM with identical text and no ids, so the first
 * text match is the invisible copy on desktop.
 */
export function MobilePayBar({ amount, onProceed }: { amount: number | null; onProceed: () => void }) {
  const { t } = useT();
  return (
    <div className={s.mobileBar}>
      <div className={s.mobileAmount}>
        <span className="small muted">{t("pt.sumPayable")}</span>
        <strong>{amount === null ? "—" : formatINR(amount)}</strong>
      </div>
      <button type="button" className="btn btn-accent" onClick={onProceed}>
        {t("pt.proceed")}
      </button>
    </div>
  );
}
