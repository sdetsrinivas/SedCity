"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { useSession } from "@/lib/useSession";
import type { Role } from "@/lib/session";
import type { Session } from "@/lib/session";

export function RequireRole({ role, children }: { role: Role; children: (s: Session) => ReactNode }) {
  const { session, ready } = useSession();
  const { t } = useT();
  const pathname = usePathname();
  if (!ready) return <div className="skeleton" style={{ height: 120 }} />;
  if (!session) {
    return (
      <div className="alert alert-info">
        {t("dash.signInPrompt")} <Link href={`/login?next=${encodeURIComponent(pathname)}`}>{t("nav.login")}</Link>
      </div>
    );
  }
  if (session.role !== role) return <div className="alert alert-error">{t("officer.denied")}</div>;
  return <>{children(session)}</>;
}
