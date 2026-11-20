"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import type { Application } from "@/lib/applications";
import { formatDate, formatINR, todayISO } from "@/lib/format";
import type { Session } from "@/lib/session";
import { fetchMyBookings } from "@/mock/endpoints/bookings";
import { venueById } from "./booking";
import { canMove, sortBookings } from "./manage";
import { MoveBoard } from "./MoveBoard";
import s from "./Bookings.module.css";

type List = { state: "loading" } | { state: "error" } | { state: "ready"; rows: Application[] };

const statusKey = (a: Application): "bk.st.lapsed" | "bk.st.paid" | "bk.st.due" =>
  a.status === "Rejected" ? "bk.st.lapsed" : a.status === "Paid" ? "bk.st.paid" : "bk.st.due";

/**
 * TBL-08: "My bookings" of the signed-in citizen (MY_BOOKINGS). Several rows carry exactly the same venue,
 * date and time (a booking that lapsed unpaid and its rebooking of the same slots; another venue on the same
 * evening; the same hall a week later), and every movable row has an identical "Move" button with no
 * row-specific name. Only the booking number (the row header) tells the rows apart. Rows are sorted by date,
 * time and number, so a move re-sorts them and a row's position changes. At narrow widths the rows are
 * stacked (each cell labelled from `data-label`), so there is no page-level horizontal scroll.
 */
export function MyBookings({ session, version, onMoved }: { session: Session; version: number; onMoved: () => void }) {
  const { t, lang } = useT();
  const uid = useId();
  const [today] = useState(todayISO);
  const [list, setList] = useState<List>({ state: "loading" });
  const [reload, setReload] = useState(0);
  const [moving, setMoving] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    let live = true;
    setList({ state: "loading" });
    fetchMyBookings(session.mobile)
      .then((rows) => { if (live) setList({ state: "ready", rows }); })
      .catch(() => { if (live) setList({ state: "error" }); });
    return () => { live = false; };
  }, [session.mobile, version, reload]);

  const moved = useCallback((app: Application) => {
    setList((l) => (l.state === "ready" ? { state: "ready", rows: sortBookings(l.rows.map((r) => (r.ref === app.ref ? app : r))) } : l));
    onMoved();
  }, [onMoved]);

  const close = () => {
    const ref = moving;
    setMoving(null);
    if (ref) requestAnimationFrame(() => buttons.current.get(ref)?.focus());
  };

  const rows = list.state === "ready" ? list.rows : [];
  const open = moving ? rows.find((r) => r.ref === moving && canMove(r, today)) : undefined;
  const titleId = `${uid}t`;
  const boardId = `${uid}b`;
  const cols = {
    ref: t("bk.col.ref"), venue: t("bk.col.venue"), date: t("bk.col.date"), time: t("bk.col.time"),
    status: t("bk.col.status"), amount: t("bk.col.amount"), action: t("bk.col.action"),
  };

  return (
    <>
      <section className={`card ${s.section}`} aria-labelledby={titleId}>
        <div className="card-title">
          <h2 id={titleId}>{t("bk.mine.title")}</h2>
          {rows.length > 0 && <span className="badge">{t("bk.mine.count", { n: rows.length })}</span>}
        </div>
        <div className="card-body">
          {list.state === "loading" && <p className={s.loading} role="status">{t("bk.mine.loading")}</p>}
          {list.state === "error" && (
            <div className="alert alert-error" role="alert">
              {t("bk.mine.error")}{" "}
              <button type="button" className="link-btn" onClick={() => setReload((n) => n + 1)}>{t("bk.retry")}</button>
            </div>
          )}
          {list.state === "ready" && rows.length === 0 && <p className="muted">{t("bk.mine.empty")}</p>}
          {list.state === "ready" && rows.length > 0 && (
            <>
              <div className={s.mineScroll}>
              <table className={`data-table ${s.mine}`}>
                <thead>
                  <tr>
                    <th scope="col">{cols.ref}</th>
                    <th scope="col">{cols.venue}</th>
                    <th scope="col">{cols.date}</th>
                    <th scope="col">{cols.time}</th>
                    <th scope="col">{cols.status}</th>
                    <th scope="col">{cols.amount}</th>
                    <th scope="col"><span className="sr-only">{cols.action}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => {
                    const v = venueById(a.details.venue);
                    const refId = `${uid}r${i}`;
                    const movable = canMove(a, today);
                    return (
                      <tr key={a.ref} className={a.status === "Rejected" ? s.mineLapsed : undefined}>
                        <th scope="row" id={refId} className={s.mineRef} data-label={cols.ref}>{a.ref}</th>
                        <td data-label={cols.venue}>{v ? pick(v, lang) : a.details.venue}</td>
                        <td data-label={cols.date} className={s.mineNowrap}>{formatDate(a.details.date)}</td>
                        <td data-label={cols.time} className={s.mineNowrap}>{`${a.details.start} – ${a.details.end}`}</td>
                        <td data-label={cols.status}>
                          <span>
                          <span className={`${s.mineBadge} ${s[`mine_${statusKey(a).slice(6)}`]}`}>{t(statusKey(a))}</span>
                          {a.status === "Submitted" && a.details.payBy && (
                            <span className={`small muted ${s.minePay}`}>{t("bk.payByN", { date: formatDate(a.details.payBy) })}</span>
                          )}
                          </span>
                        </td>
                        <td data-label={cols.amount} className={s.mineAmount}>{formatINR(a.amount ?? 0)}</td>
                        <td className={s.mineAction}>
                          {movable && (
                            <button
                              type="button"
                              className={`btn btn-outline ${s.mineBtn}`}
                              ref={(el) => { if (el) buttons.current.set(a.ref, el); else buttons.current.delete(a.ref); }}
                              aria-describedby={refId}
                              aria-expanded={moving === a.ref}
                              aria-controls={moving === a.ref ? boardId : undefined}
                              onClick={() => setMoving(a.ref)}
                            >
                              {t("bk.move")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <p className="small muted">{t("bk.mine.note")}</p>
            </>
          )}
        </div>
      </section>
      {open && <MoveBoard key={open.ref} id={boardId} booking={open} today={today} mobile={session.mobile} onMoved={moved} onClose={close} />}
    </>
  );
}
