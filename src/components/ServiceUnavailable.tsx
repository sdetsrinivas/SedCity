import Link from "next/link";
import { getT } from "@/i18n/server";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";

/** Temporary page for services not yet online (replaced as each module ships). */
export async function ServiceUnavailable({ titleKey }: { titleKey: DictKey }) {
  const { t } = await getT();
  return (
    <>
      <div className="page-head">
        <div className="container">
          <ol className="breadcrumb"><li><Link href="/">{t("nav.home")}</Link></li><li>{t(titleKey)}</li></ol>
          <h1>{t(titleKey)}</h1>
        </div>
      </div>
      <div className="container page" style={{ maxWidth: 760 }}>
        <div className="alert alert-info" role="status" style={{ display: "flex", gap: 12 }}>
          <Icon name="info" />
          <div><strong>{t("soon.title")}</strong><p style={{ margin: "4px 0 0" }}>{t("soon.body")}</p></div>
        </div>
        <Link href="/" className="btn btn-outline">{t("notFound.home")}</Link>
      </div>
    </>
  );
}
