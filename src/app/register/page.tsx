import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { RegisterForm } from "@/modules/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const { t } = await getT();
  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <section className="card" aria-labelledby="reg-title">
        <div className="card-body">
          <h1 id="reg-title">{t("reg.title")}</h1>
          <p className="muted small">{t("reg.subtitle")}</p>
          <RegisterForm />
        </div>
      </section>
    </div>
  );
}
