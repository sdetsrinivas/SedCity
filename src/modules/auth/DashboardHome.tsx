"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { SERVICE_GROUPS } from "@/components/layout/MainNav";
import { Icon } from "@/components/ui/Icon";
import { RequireRole } from "./RequireRole";

export function DashboardHome() {
  const { t, lang } = useT();
  return (
    <RequireRole role="citizen">
      {(s) => (
        <>
          <h1>{t("dash.welcome")}, {lang === "ta" ? s.nameTa : s.name}</h1>
          <p className="muted">{s.astheenId} · {s.ward}</p>
          <h2 style={{ marginTop: 24 }}>{t("dash.servicesTitle")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {SERVICE_GROUPS.flatMap((g) => g.items).map((it) => (
              <Link key={it.href + it.key} href={it.href} className="card card-body" style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                <Icon name={it.icon} /> {t(it.key)}
              </Link>
            ))}
          </div>
        </>
      )}
    </RequireRole>
  );
}

export function OfficerHome() {
  const { t, lang } = useT();
  return (
    <RequireRole role="officer">
      {(s) => (
        <>
          <h1>{t("officer.title")}</h1>
          <p className="muted">{lang === "ta" ? s.nameTa : s.name} · {s.ward}</p>
          <p>{t("officer.body")}</p>
        </>
      )}
    </RequireRole>
  );
}
