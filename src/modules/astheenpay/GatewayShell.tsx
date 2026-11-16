"use client";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import s from "./AstheenPay.module.css";

/** AstheenPay's own branding around the checkout (the portal header and footer are hidden on /pay/…). */
export function GatewayShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className={s.shell}>
      <header className={s.brandBar}>
        <span className={s.brand}><span className={s.mark} aria-hidden="true">A</span>{t("ap.brand")}</span>
        <span className={s.secure}><Icon name="lock" size={14} /> {t("ap.secure")}</span>
      </header>
      <div className={s.content}>{children}</div>
      <footer className={s.foot}>{t("ap.footer")}</footer>
    </div>
  );
}
