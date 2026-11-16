"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { useSession } from "@/lib/useSession";
import { formatDateTime } from "@/lib/format";
import { categoryById, myGrievances } from "@/mock/endpoints/grievance";
import { wardById } from "@/mock/endpoints/geo";
import { STAGES } from "./tracking";
import s from "./Track.module.css";

/**
 * TBL-07: "My grievances" for a signed-in citizen. The table sits in its own scroll container
 * (max-height ~ 7 rows) and its header cells are `position: sticky; top: 0`, so while the container is
 * scrolled the header stays on top and covers the rows that pass under it.
 */
export function MyGrievances({ version, onView }: { version: number; onView: (ref: string) => void }) {
  const { t, lang } = useT();
  const { session, ready } = useSession();
  const rows = useMemo(
    () => (session?.role === "citizen" ? myGrievances(session.username, session.mobile) : []),
    [session, version], // version changes after each status check or update: read the store again
  );
  if (!ready) return null;

  return (
    <section className="card">
      <div className="card-title">
        <h2 id="gt-mine-title">{t("gt.mineTitle")}</h2>
        {session?.role === "citizen" && rows.length > 0 && <span className="badge">{t("gt.mineCount", { n: rows.length })}</span>}
      </div>
      <div className="card-body">
        {session?.role !== "citizen" ? (
          <p className={s.mineNote}>
            {t("gt.mineSignIn")} <Link href="/login">{t("gt.signIn")}</Link>
          </p>
        ) : rows.length === 0 ? (
          <p className={s.mineNote}>
            {t("gt.mineEmpty")} <Link href="/grievances/new">{t("gt.newGrievance")}</Link>
          </p>
        ) : (
          <div className={s.tableScroll} role="region" aria-labelledby="gt-mine-title" tabIndex={0}>
            <table className={`data-table ${s.stickyTable}`}>
              <thead>
                <tr>
                  <th scope="col">{t("gt.col.ref")}</th>
                  <th scope="col">{t("gt.col.category")}</th>
                  <th scope="col">{t("gt.col.ward")}</th>
                  <th scope="col">{t("gt.col.date")}</th>
                  <th scope="col">{t("gt.col.status")}</th>
                  <th scope="col"><span className="sr-only">{t("gt.col.action")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const cat = categoryById(g.category);
                  const ward = wardById(g.ward);
                  const key = STAGES[g.stage];
                  return (
                    <tr key={g.ref}>
                      <td className={s.refCell}>{g.ref}</td>
                      <td>{cat ? pick(cat, lang) : g.category}</td>
                      <td>{ward ? pick(ward, lang) : g.ward}</td>
                      <td>{formatDateTime(g.submittedAt).slice(0, 10)}</td>
                      <td><span className={`${s.stageBadge} ${s[`badge_${key}`]}`}>{t(`gt.stage.${key}`)}</span></td>
                      <td>
                        <button type="button" className={`btn btn-ghost ${s.viewBtn}`} aria-label={t("gt.viewRef", { ref: g.ref })}
                          onClick={() => { onView(g.ref); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          {t("gt.view")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
