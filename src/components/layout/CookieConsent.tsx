"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { store } from "@/mock/store";
import s from "./CookieConsent.module.css";

/** OTH-22: shown only on the first visit (no `amc.consent` in localStorage); appears after hydration. */
export function CookieConsent() {
  const { t } = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (store.get<string | null>("consent", null) === null) setShow(true);
  }, []);
  if (!show) return null;
  const decide = (v: "all" | "essential") => {
    store.set("consent", v);
    setShow(false);
  };
  return (
    <section className={s.banner} role="region" aria-label={t("cookie.title")}>
      <div className={`container ${s.inner}`}>
        <div>
          <h2 className={s.title}>{t("cookie.title")}</h2>
          <p className={s.body}>
            {t("cookie.body")} <Link href="/info/privacy">{t("cookie.policy")}</Link>
          </p>
        </div>
        <div className={s.actions}>
          <button type="button" className="btn btn-outline" onClick={() => decide("essential")}>{t("cookie.reject")}</button>
          <button type="button" className="btn btn-primary" onClick={() => decide("all")}>{t("cookie.accept")}</button>
        </div>
      </div>
    </section>
  );
}
