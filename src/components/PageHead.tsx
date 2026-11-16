import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";

/** Breadcrumb + page title band used at the top of every service page. */
export async function PageHead({ title, trail = [], intro }: { title: string; trail?: { label: string; href?: string }[]; intro?: ReactNode }) {
  const { t } = await getT();
  return (
    <div className="page-head">
      <div className="container">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb">
            <li><Link href="/">{t("nav.home")}</Link></li>
            {trail.map((c) => <li key={c.label}>{c.href ? <Link href={c.href}>{c.label}</Link> : c.label}</li>)}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1>{title}</h1>
        {intro && <p className="muted" style={{ margin: "6px 0 0", maxWidth: "75ch" }}>{intro}</p>}
      </div>
    </div>
  );
}
