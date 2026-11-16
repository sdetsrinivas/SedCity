import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "@/modules/auth/LoginForm";
import s from "@/modules/auth/Auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string }> }) {
  const { t } = await getT();
  const { reason, next } = await searchParams;
  const notice = reason === "timeout" ? t("login.timedOut") : reason === "signout" ? t("login.signedOut") : reason === "registered" ? t("login.registered") : null;
  return (
    <div className="container page">
      <div className={s.layout}>
        <section className={s.side} aria-labelledby="login-side-title">
          <h2 id="login-side-title">{t("login.sideTitle")}</h2>
          <ul>
            {(["login.side1", "login.side2", "login.side3", "login.side4"] as const).map((k) => (
              <li key={k}><Icon name="check" size={18} /> {t(k)}</li>
            ))}
          </ul>
          <p className={s.securityNote}>{t("login.securityNote")}</p>
        </section>
        <section className={`card ${s.formCard}`} aria-labelledby="login-title">
          <h1 id="login-title" className={s.formTitle}>{t("login.title")}</h1>
          <p className="muted small">{t("login.subtitle")}</p>
          {notice && <div className={`alert ${reason === "timeout" ? "alert-error" : "alert-info"}`} role="status">{notice}</div>}
          <LoginForm next={next} />
        </section>
      </div>
    </div>
  );
}
