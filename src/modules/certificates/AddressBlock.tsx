"use client";
import { useT } from "@/i18n/client";
import type { Address } from "./trade";
import s from "./Certificates.module.css";

interface Props {
  legend: string;
  value: Address;
  onChange: (v: Address) => void;
  lineError?: string;
  pinError?: string;
}

/**
 * Address lines used twice on the trade licence form: for the business premises and for the
 * owner's residence. OTH-13: the ids below are fixed, so the page ends up with two elements each
 * for `addr-line`, `addr-pin` and `addr-pin-help`. Both labels' `for` resolve to the FIRST element
 * with that id, so the second block's fields have no label of their own and clicking its labels
 * focuses the premises fields.
 */
export function AddressBlock({ legend, value, onChange, lineError, pinError }: Props) {
  const { t } = useT();
  return (
    <fieldset className={s.fieldset}>
      <legend className={s.legend}>{legend}</legend>
      <div className={s.pair}>
        <div className="field">
          <label htmlFor="addr-line">{t("tl.addrLine")}</label>
          <textarea id="addr-line" name="line" className="input" rows={2} autoComplete="off" value={value.line}
            aria-invalid={!!lineError} onChange={(e) => onChange({ ...value, line: e.target.value })} />
          {lineError && <span className="error">{lineError}</span>}
        </div>
        <div className="field">
          <label htmlFor="addr-pin">{t("tl.addrPin")}</label>
          <input id="addr-pin" name="pin" className={`input ${s.short}`} inputMode="numeric" autoComplete="off" maxLength={6}
            value={value.pin} aria-invalid={!!pinError} aria-describedby="addr-pin-help"
            onChange={(e) => onChange({ ...value, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
          <span className="help" id="addr-pin-help">{t("tl.addrPinHelp")}</span>
          {pinError && <span className="error">{pinError}</span>}
        </div>
      </div>
    </fieldset>
  );
}
