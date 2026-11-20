"use client";
import { useT } from "@/i18n/client";
import { RequireRole } from "./RequireRole";

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
