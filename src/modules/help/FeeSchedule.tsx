import { getT } from "@/i18n/server";
import { formatDate } from "@/lib/format";
import { feeSchedule, FEES_EFFECTIVE } from "./fees";
import s from "./Help.module.css";

/**
 * TBL-01: the schedule of fees and charges, a plain server-rendered `<table>` (caption, column headers,
 * a row header per service). The groups are separate `<tbody>`s, each opened by a group row whose
 * single header cell spans all columns, so row positions do not match services one to one.
 */
export async function FeeSchedule() {
  const { t, lang } = await getT();
  const groups = feeSchedule(t, lang);
  return (
    <div className={s.tableWrap}>
      <table className={`data-table ${s.fees}`} id="fee-schedule">
        <caption className={s.caption}>{t("help.fee.caption", { date: formatDate(FEES_EFFECTIVE) })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("help.fee.colService")}</th>
            <th scope="col">{t("help.fee.colFee")}</th>
            <th scope="col">{t("help.fee.colUnit")}</th>
            <th scope="col">{t("help.fee.colNote")}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id}>
            <tr className={s.groupRow}>
              <th scope="rowgroup" colSpan={4}>{g.title}</th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.service}>
                <th scope="row">{r.service}</th>
                <td className={s.fee}>{r.fee}</td>
                <td>{r.unit}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="muted small">{t("help.fee.footnote")}</p>
    </div>
  );
}
