"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { Modal } from "@/components/ui/Modal";
import { formatINR } from "@/lib/format";
import { TARIFFS, type ConnType } from "@/mock/endpoints/electricity";

/**
 * DLG-07: nested modals. "View tariff" opens a portal modal; inside it "What is a slab?" opens a
 * second portal modal stacked on top. Escape / the close button only dismiss the top-most one.
 */
export function TariffModals({ open, onClose, type }: { open: boolean; onClose: () => void; type: ConnType }) {
  const { t } = useT();
  const [glossary, setGlossary] = useState(false);
  const typeLabel = t(type === "domestic" ? "el.domestic" : type === "commercial" ? "el.commercial" : "el.industrial");
  return (
    <>
      <Modal open={open} onClose={onClose} title={t("el.tariffTitle")} size="lg"
        footer={<button type="button" className="btn btn-primary" onClick={onClose}>{t("common.close")}</button>}>
        <p className="small muted">{t("el.tariffFor", { type: typeLabel })}</p>
        <table className="data-table">
          <thead><tr><th scope="col">{t("el.slab")}</th><th scope="col">{t("el.rate")}</th></tr></thead>
          <tbody>
            {TARIFFS.energy[type].map((sl) => (
              <tr key={sl.from}>
                <td>{sl.to === null ? t("el.above", { n: sl.from - 1 }) : `${sl.from}–${sl.to}`}</td>
                <td>{sl.rate === 0 ? t("el.free") : formatINR(sl.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}>{t("el.fixed", { amount: formatINR(TARIFFS.fixedPerKw[type], true) })}</p>
        <button type="button" className="link-btn small" onClick={() => setGlossary(true)}>{t("el.whatSlab")}</button>
      </Modal>
      <Modal open={open && glossary} onClose={() => setGlossary(false)} title={t("el.glossaryTitle")}
        footer={<button type="button" className="btn btn-outline" onClick={() => setGlossary(false)}>{t("el.backToTariff")}</button>}>
        <p>{t("el.glossarySlab")}</p>
        <p>{t("el.glossaryKw")}</p>
        <p>{t("el.glossaryDeposit")}</p>
      </Modal>
    </>
  );
}
