"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { departmentById, fetchOfficialsForExport, HELPLINE, officeName, type OfficialsQuery } from "@/mock/endpoints/directory";
import { exportFileName, toCsv } from "./csv";

/**
 * FIL-06: CSV download. Fetches every official matching the current filter and sort (all pages, not just the
 * one on screen; DIRECTORY_EXPORT, 1s), builds a UTF-8 CSV in the page language (csv.ts) and saves it through a
 * temporary `<a download>` with a blob URL: `amc-officials-<department|all>.csv`.
 */
export function ExportButton({ query, onFailed }: { query: OfficialsQuery; onFailed: (failed: boolean) => void }) {
  const { t, lang } = useT();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    onFailed(false);
    try {
      const rows = await fetchOfficialsForExport(query, lang);
      const csv = toCsv([
        (["name", "designation", "department", "office", "phone", "email"] as const).map((k) => t(`dir.col.${k}`)),
        ...rows.map((o) => {
          const dept = departmentById(o.department);
          return [
            pick(o.name, lang),
            pick(o.designation, lang),
            dept ? pick(dept, lang) : o.department,
            pick(officeName(o.office), lang),
            `${HELPLINE} ${t("dir.ext", { ext: o.ext })}`,
            o.email,
          ];
        }),
      ]);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(query.department);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      onFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-outline" onClick={download} disabled={busy}>
      <Icon name="download" size={18} /> {busy ? t("dir.exporting") : t("dir.export")}
    </button>
  );
}
