"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import type { Application } from "@/lib/applications";
import { formatDate, toISODate } from "@/lib/format";
import { venueById } from "@/modules/bookings/booking";
import type { HandleProps } from "./WidgetBoard";
import { WidgetCard } from "./WidgetCard";
import s from "./Dashboard.module.css";

const statusKey = (a: Application): DictKey => {
  if (a.service === "booking") return a.status === "Rejected" ? "bk.st.lapsed" : a.status === "Paid" ? "bk.st.paid" : "bk.st.due";
  return `dash.app.st.${a.status.replace(" ", "")}` as DictKey;
};

/**
 * My applications: everything submitted from this browser plus the citizen's bookings (seeded ones too,
 * read through allBookings(), so a moved booking shows its new date). Newest first.
 */
export function Applications({ apps, handle }: { apps: Application[] | null; handle: HandleProps }) {
  const { t, lang } = useT();
  const detail = (a: Application) => {
    if (a.service !== "booking") return a.title;
    const v = venueById(a.details.venue);
    return t("dash.app.bookingOf", { venue: v ? pick(v, lang) : a.details.venue, date: formatDate(a.details.date), time: `${a.details.start} – ${a.details.end}` });
  };
  const cols = { ref: t("dash.app.col.ref"), service: t("dash.app.col.service"), detail: t("dash.app.col.detail"), date: t("dash.app.col.date"), status: t("dash.app.col.status") };

  return (
    <WidgetCard
      title={t("dash.app.title")}
      handle={handle}
      busy={apps === null}
      badge={apps && apps.length > 0 ? <span className="badge">{t("dash.app.count", { n: apps.length })}</span> : undefined}
    >
      {apps !== null && apps.length === 0 ? (
        <p className="muted">{t("dash.app.empty")} <Link href="/">{t("dash.app.start")}</Link></p>
      ) : (
        <div className={s.tableScroll}>
          <table className={`data-table ${s.apps}`}>
            <thead>
              <tr>
                <th scope="col">{cols.ref}</th>
                <th scope="col">{cols.service}</th>
                <th scope="col">{cols.detail}</th>
                <th scope="col">{cols.date}</th>
                <th scope="col">{cols.status}</th>
              </tr>
            </thead>
            <tbody>
              {apps === null
                ? [0, 1, 2].map((i) => (
                  <tr key={i}>
                    {[0, 1, 2, 3, 4].map((c) => <td key={c}><span className="skeleton" style={{ display: "block", height: 14, width: c === 2 ? "90%" : "70%" }} /></td>)}
                  </tr>
                ))
                : apps.map((a) => (
                  <tr key={a.ref}>
                    <th scope="row" data-label={cols.ref} className={s.nowrap}>{a.ref}</th>
                    <td data-label={cols.service}>{t(`dash.svc.${a.service}` as DictKey)}</td>
                    <td data-label={cols.detail}>{detail(a)}</td>
                    <td data-label={cols.date} className={s.nowrap}>{formatDate(toISODate(new Date(a.submittedAt)))}</td>
                    <td data-label={cols.status}><span className={`badge ${s[`st_${a.status.replace(" ", "")}`] ?? ""}`}>{t(statusKey(a))}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}

