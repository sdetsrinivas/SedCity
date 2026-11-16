import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container page" style={{ textAlign: "center", maxWidth: 640 }}>
      <p style={{ fontSize: "3rem", fontWeight: 800, color: "var(--c-accent)", margin: 0 }}>404</p>
      <h1>{t("notFound.title")}</h1>
      <p className="muted">{t("notFound.body")}</p>
      <Link href="/" className="btn btn-primary">{t("notFound.home")}</Link>
    </div>
  );
}
