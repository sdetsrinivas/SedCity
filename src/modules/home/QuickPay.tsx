"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import s from "./QuickPay.module.css";

export default function QuickPay() {
  const { t } = useT();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [service, setService] = useState<"water" | "tax">("water");
  const [num, setNum] = useState("");

  return (
    <aside className={`card ${s.card}`} aria-labelledby="quick-pay-title">
      <div className="card-body">
        <h2 id="quick-pay-title" className={s.title}><Icon name="drop" /> {t("home.quickPay")}</h2>
        <p className="muted small">{t("home.quickPayBody")}</p>
        {!expanded ? (
          <button type="button" className="btn btn-accent btn-block" onClick={() => setExpanded(true)}>
            {t("home.quickPayButton")}
          </button>
        ) : (
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              const target = service === "water" ? "/services/water/pay" : "/services/property-tax/assess";
              router.push(num ? `${target}?ref=${encodeURIComponent(num)}` : target);
            }}
          >
            <fieldset className={s.fieldset}>
              <legend className="small">{t("home.quickPayService")}</legend>
              <label className="check"><input type="radio" name="qp-service" checked={service === "water"} onChange={() => setService("water")} /> {t("home.quickPayWater")}</label>
              <label className="check"><input type="radio" name="qp-service" checked={service === "tax"} onChange={() => setService("tax")} /> {t("home.quickPayTax")}</label>
            </fieldset>
            <div className="field">
              <label htmlFor="qp-number">{t("home.quickPayNumber")}</label>
              <input id="qp-number" className="input" value={num} onChange={(e) => setNum(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">{t("home.quickPayContinue")}</button>
          </form>
        )}
      </div>
    </aside>
  );
}
