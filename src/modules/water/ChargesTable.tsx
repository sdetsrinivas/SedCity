"use client";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import type { Charges } from "./bill";
import water from "@/mock/data/water.json";
import s from "./Water.module.css";

/**
 * TBL-04: nested table. The "Water charges" row holds a whole slab-wise <table> inside its first cell,
 * so `table tr` / `//table//tr` also match the inner rows and column indexes shift between levels.
 */
export function ChargesTable({ charges }: { charges: Charges }) {
  const { t } = useT();
  const rows: [string, number][] = [
    [t("wt.sewerage", { p: water.tariff.seweragePercent }), charges.sewerage],
    [t("wt.meterRent"), charges.meterRent],
    [t("wt.arrears"), charges.arrears],
    [t("wt.lateFee"), charges.lateFee],
  ];
  return (
    <div className={s.tableWrap}>
      <table id="bill-charges" className={`data-table ${s.charges}`}>
        <caption>{t("wt.chargesCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("wt.colDescription")}</th>
            <th scope="col" className={s.num}>{t("wt.colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className={s.chargeName}>{t("wt.waterCharges")}</span>
              <table className={s.slabs}>
                <caption>{t("wt.slabCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("wt.colSlab")}</th>
                    <th scope="col" className={s.num}>{t("wt.colUnits")}</th>
                    <th scope="col" className={s.num}>{t("wt.colRate")}</th>
                    <th scope="col" className={s.num}>{t("wt.colAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.slabs.map((l) => (
                    <tr key={l.from}>
                      <td>{l.to === null ? t("wt.slabAbove", { from: l.from }) : t("wt.slabRange", { from: l.from, to: l.to })}</td>
                      <td className={s.num}>{l.units}</td>
                      <td className={s.num}>{l.rate.toFixed(2)}</td>
                      <td className={s.num}>{formatINR(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
            <td className={s.num}>{formatINR(charges.water)}</td>
          </tr>
          {rows.map(([label, amount]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={s.num}>{formatINR(amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t("wt.total")}</th>
            <td className={s.num}>{formatINR(charges.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
