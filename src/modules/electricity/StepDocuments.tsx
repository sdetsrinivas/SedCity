"use client";
import { useT } from "@/i18n/client";
import { addDays, formatDate, todayISO } from "@/lib/format";
import { DateField } from "./DateField";
import { FileButton } from "./FileButton";
import type { StepProps } from "./types";

export const inspectionRange = () => ({ min: addDays(todayISO(), 1), max: addDays(todayISO(), 30) });

export function StepDocuments({ draft, set, errors }: StepProps) {
  const { t } = useT();
  const { min, max } = inspectionRange();
  const range = { min: formatDate(min), max: formatDate(max) };
  return (
    <>
      <DateField id="el-inspection" label={t("el.inspection")} help={t("el.inspectionHelp", range)}
        value={draft.inspectionDate} onChange={(v) => set("inspectionDate", v)} min={min} max={max}
        invalid={!!errors.inspectionDate} describedBy={errors.inspectionDate ? "err-inspectionDate el-inspection-help" : "el-inspection-help"} />
      {errors.inspectionDate && <span className="error" id="err-inspectionDate" style={{ display: "block", marginTop: -10, marginBottom: 12 }}>{t("el.errDate", range)}</span>}
      <FileButton id="idProof" label={t("el.idProof")} value={draft.idProof} onChange={(f) => set("idProof", f)} error={errors.idProof} />
      <FileButton id="ownershipProof" label={t("el.ownership")} value={draft.ownershipProof} onChange={(f) => set("ownershipProof", f)} error={errors.ownershipProof} />
    </>
  );
}
