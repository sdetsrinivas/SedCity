"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Modal } from "@/components/ui/Modal";
import { departmentById, HELPLINE, officeName, phoneHref, type Official } from "@/mock/endpoints/directory";
import s from "./Directory.module.css";

/** Contact card of one official, opened from the row's “View details” action (BTN-02). */
export function OfficialDetails({ official, onClose }: { official: Official | null; onClose: () => void }) {
  const { t, lang } = useT();
  if (!official) return null;
  const dept = departmentById(official.department);
  return (
    <Modal
      open
      title={pick(official.name, lang)}
      onClose={onClose}
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>{t("common.close")}</button>}
    >
      <dl className={s.facts}>
        <dt>{t("dir.col.designation")}</dt>
        <dd>{pick(official.designation, lang)}</dd>
        <dt>{t("dir.col.department")}</dt>
        <dd>{dept ? pick(dept, lang) : official.department}</dd>
        <dt>{t("dir.col.office")}</dt>
        <dd>{pick(officeName(official.office), lang)}</dd>
        <dt>{t("dir.col.phone")}</dt>
        <dd><a href={phoneHref(official)}>{HELPLINE} · {t("dir.ext", { ext: official.ext })}</a></dd>
        <dt>{t("dir.col.email")}</dt>
        <dd><a href={`mailto:${official.email}`}>{official.email}</a></dd>
      </dl>
    </Modal>
  );
}
