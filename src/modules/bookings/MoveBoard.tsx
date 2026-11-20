"use client";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick as pickLang, type DictKey } from "@/i18n";
import type { Application } from "@/lib/applications";
import { addDays, formatDate } from "@/lib/format";
import { pushSms } from "@/lib/sms";
import { fetchWeek, moveBooking, type BoardDay } from "@/mock/endpoints/bookings";
import { SLOT_HOURS, firstBookable, hhmm, venueById, venueSlots } from "./booking";
import { mondayOf, runFrom, slotsOf, weekNav, type MoveProblem } from "./manage";
import s from "./Bookings.module.css";

type Week = { state: "loading" } | { state: "error" } | { state: "ready"; days: BoardDay[] };
type Cell = { date: string; hour: number };
type Msg = { kind: "ok" | "err" | "info"; text: string };

const ERR: Record<Exclude<MoveProblem, "same">, DictKey> = {
  taken: "bk.mv.errTaken", closed: "bk.mv.errClosed", outside: "bk.mv.errOutside", hours: "bk.mv.errHours",
};
const STATE: Record<MoveProblem | "free", DictKey> = {
  free: "bk.mv.stFree", taken: "bk.mv.stTaken", closed: "bk.mv.stClosed", outside: "bk.mv.stOutside", hours: "bk.mv.stHours", same: "bk.mv.stSame",
};
const same = (a: Cell | null, b: Cell | null) => !!a && !!b && a.date === b.date && a.hour === b.hour;

interface Props {
  id: string;
  booking: Application;
  today: string;
  mobile: string;
  onMoved: (booking: Application) => void;
  onClose: () => void;
}

/**
 * OTH-03: moving a booking with native HTML5 drag-and-drop. The booking is a `draggable=true` card above a
 * week board (a plain <table>: one row per two-hour slot, one column per day). `dragstart` puts the booking
 * number into the DataTransfer as text/plain; each board cell cancels `dragover` (so it accepts the drop)
 * and its `drop` handler reads that number back and moves the booking to start at the cell's time, keeping
 * its length. A drop whose DataTransfer does not carry this booking's number does nothing. The cell under
 * the pointer is highlighted only during a real drag (state set by `dragstart`). The target is checked on
 * the board (closed day, outside the window, past closing time, booked) and again by the move
 * (BOOKING_MOVE), which rewrites the same booking record; on any error the booking stays where it was.
 * Keyboard: Space on the focused card picks it up, the arrow keys move a cursor over the board (crossing
 * into the previous / next week), Space moves the booking there and Escape cancels.
 */
export function MoveBoard({ id, booking, today, mobile, onMoved, onClose }: Props) {
  const { t, lang } = useT();
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const v = venueById(booking.details.venue)!;
  const hours = venueSlots(v);
  const own = slotsOf(booking);
  const count = own.length;
  const timeOf = (start: number) => `${hhmm(start)} – ${hhmm(start + count * SLOT_HOURS)}`;

  const [monday, setMonday] = useState(() => mondayOf(booking.details.date));
  const [week, setWeek] = useState<Week>({ state: "loading" });
  const [reload, setReload] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState<Cell | null>(null);
  const [cursor, setCursor] = useState<Cell | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  const nav = weekNav(monday, today);

  useEffect(() => {
    let live = true;
    setWeek({ state: "loading" });
    fetchWeek(v.id, monday, booking.ref)
      .then((days) => { if (live) setWeek({ state: "ready", days }); })
      .catch(() => { if (live) setWeek({ state: "error" }); });
    return () => { live = false; };
  }, [v.id, monday, booking.ref, reload]);

  useEffect(() => {
    boxRef.current?.scrollIntoView?.({ block: "start" });
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  const days = week.state === "ready" ? week.days : [];

  /** Why the booking cannot start at this cell (from the board's data), or null. */
  const problemAt = (c: Cell): MoveProblem | null => {
    if (c.date === booking.details.date && c.hour === own[0]) return "same";
    const day = days.find((d) => d.date === c.date);
    if (!day || day.status === "outside") return "outside";
    if (day.status === "closed") return "closed";
    const run = runFrom(c.hour, count);
    if (!run.every((h) => hours.includes(h))) return "hours";
    return run.some((h) => day.taken.includes(h)) ? "taken" : null;
  };

  const describe = (c: Cell) =>
    t("bk.mv.target", { date: formatDate(c.date), time: timeOf(c.hour), state: t(STATE[problemAt(c) ?? "free"]) });

  const attempt = async (c: Cell) => {
    if (busy || week.state !== "ready") return;
    const vars = { date: formatDate(c.date), time: timeOf(c.hour) };
    const problem = problemAt(c);
    if (problem === "same") return setMsg({ kind: "info", text: t("bk.mv.same", vars) });
    if (problem) return setMsg({ kind: "err", text: t(ERR[problem], vars) });
    setBusy(true);
    setMsg(null);
    try {
      const venueName = pickLang(v, lang);
      const res = await moveBooking(booking.ref, c.date, c.hour, t("bk.appTitle", { venue: venueName, date: vars.date }));
      if (!res.ok) {
        setMsg({ kind: "err", text: res.reason === "missing" || res.reason === "same" ? t("bk.mv.errMissing") : t(ERR[res.reason], vars) });
        setReload((n) => n + 1); // the board was out of date: load the week again
        return;
      }
      pushSms(mobile.replace(/\D/g, "").slice(-10), t("bk.mv.sms", { ref: booking.ref, venue: venueName, ...vars }));
      setCursor(null);
      setMsg({ kind: "ok", text: t("bk.mv.done", { ref: booking.ref, ...vars }) });
      onMoved(res.booking);
    } catch {
      setMsg({ kind: "err", text: t("bk.mv.errFail") });
    } finally {
      setBusy(false);
    }
  };

  // ── Drag and drop ──
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer) return; // a synthetic event without a DataTransfer carries nothing
    e.dataTransfer.setData("text/plain", booking.ref);
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
    setCursor(null);
    setMsg(null);
  };
  const onDragEnd = () => { setDragging(false); setOver(null); };
  const onCellOver = (e: DragEvent<HTMLTableCellElement>, c: Cell) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (dragging && !same(over, c)) setOver(c);
  };
  const onCellDrop = (e: DragEvent<HTMLTableCellElement>, c: Cell) => {
    e.preventDefault();
    setOver(null);
    setDragging(false);
    if (e.dataTransfer?.getData("text/plain").trim() !== booking.ref) return;
    void attempt(c);
  };

  // ── Keyboard ──
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (busy) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!cursor) {
        const inWeek = booking.details.date >= monday && booking.details.date <= addDays(monday, 6);
        const start = inWeek ? booking.details.date : [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i)).find((d) => d >= firstBookable(today)) ?? monday;
        setCursor({ date: start, hour: inWeek ? own[0] : hours[0] });
        setMsg({ kind: "info", text: t("bk.mv.picked") });
      } else void attempt(cursor);
      return;
    }
    if (!cursor) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setCursor(null);
      setMsg({ kind: "info", text: t("bk.mv.cancelled") });
      return;
    }
    const step: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (!(e.key in step)) return;
    e.preventDefault();
    const [dd, dh] = step[e.key];
    const hi = Math.min(Math.max(hours.indexOf(cursor.hour) + dh, 0), hours.length - 1);
    const date = addDays(cursor.date, dd);
    if (date < monday) {
      if (!nav.prev) return;
      setMonday(addDays(monday, -7));
    } else if (date > addDays(monday, 6)) {
      if (!nav.next) return;
      setMonday(addDays(monday, 7));
    }
    setCursor({ date, hour: hours[hi] });
  };

  const target = over ?? cursor;
  const targetProblem = target && week.state === "ready" ? problemAt(target) : null;
  const inTarget = (c: Cell) => !!target && target.date === c.date && runFrom(target.hour, count).includes(c.hour);
  const isOwn = (c: Cell) => c.date === booking.details.date && own.includes(c.hour);
  const dayHead = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: "short" });
  };
  const cardHelp = `${id}h`;

  return (
    <section ref={boxRef} id={id} className={`card ${s.section} ${s.board}`} aria-labelledby={`${id}t`}>
      <div className="card-title">
        <h2 id={`${id}t`}>{t("bk.mv.title", { ref: booking.ref })}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("bk.mv.close")}</button>
      </div>
      <div className="card-body">
        <p className={s.boardVenue}>{pickLang(v, lang)}</p>
        <div className={s.boardTop}>
          <div
            ref={cardRef}
            className={`${s.chip} ${cursor ? s.chipPicked : ""} ${busy ? s.chipBusy : ""}`}
            draggable={!busy}
            tabIndex={0}
            role="button"
            aria-pressed={!!cursor}
            aria-describedby={cardHelp}
            aria-disabled={busy || undefined}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onKeyDown={onKey}
          >
            <strong>{booking.ref}</strong>
            <span>{`${formatDate(booking.details.date)} · ${booking.details.start} – ${booking.details.end}`}</span>
          </div>
          <div className={s.boardHelp}>
            <p className="small">{t("bk.mv.help")}</p>
            <p className="small muted" id={cardHelp}>{t("bk.mv.keys")}</p>
          </div>
        </div>

        {msg?.kind === "err" && <div className="alert alert-error" role="alert">{msg.text}</div>}
        <p className={`small ${s.boardStatus} ${msg?.kind === "ok" ? s.boardOk : ""}`} role="status">
          {busy ? t("bk.mv.moving") : msg && msg.kind !== "err" ? msg.text : ""}
          {cursor && week.state === "ready" && !busy && <span className={s.boardCursor}>{describe(cursor)}</span>}
        </p>

        <div className={s.weekNav}>
          <button type="button" className="btn btn-outline" disabled={!nav.prev || busy} onClick={() => { setCursor(null); setMonday(addDays(monday, -7)); }}>
            {t("bk.mv.prevWeek")}
          </button>
          <strong>{`${formatDate(monday)} – ${formatDate(addDays(monday, 6))}`}</strong>
          <button type="button" className="btn btn-outline" disabled={!nav.next || busy} onClick={() => { setCursor(null); setMonday(addDays(monday, 7)); }}>
            {t("bk.mv.nextWeek")}
          </button>
        </div>

        {week.state === "loading" && <p className={s.loading} role="status">{t("bk.slotsLoading")}</p>}
        {week.state === "error" && (
          <div className="alert alert-error" role="alert">
            {t("bk.slotsError")}{" "}
            <button type="button" className="link-btn" onClick={() => setReload((n) => n + 1)}>{t("bk.retry")}</button>
          </div>
        )}
        {week.state === "ready" && (
          <div className={s.boardScroll} role="region" tabIndex={0} aria-label={t("bk.mv.board", { date: formatDate(monday) })} aria-busy={busy || undefined}>
            <table className={s.boardTable} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}>
              <thead>
                <tr>
                  <th scope="col">{t("bk.mv.time")}</th>
                  {days.map((d) => (
                    <th scope="col" key={d.date} className={d.status ? s.dayOff : undefined}>
                      <span>{dayHead(d.date)}</span>
                      <span className={s.dayDate}>{formatDate(d.date).slice(0, 5)}</span>
                      {d.status && <span className={s.dayWhy}>{t(d.status === "closed" ? "bk.mv.dayClosed" : "bk.mv.dayOutside")}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h}>
                    <th scope="row">{`${hhmm(h)} – ${hhmm(h + SLOT_HOURS)}`}</th>
                    {days.map((d) => {
                      const c = { date: d.date, hour: h };
                      const taken = !d.status && d.taken.includes(h);
                      const mine = isOwn(c);
                      const hit = inTarget(c);
                      const cls = [
                        s.cell,
                        d.status ? s.cellOff : "",
                        taken ? s.cellTaken : "",
                        mine ? s.cellOwn : "",
                        hit ? (targetProblem === null ? s.cellOk : targetProblem === "same" ? s.cellSame : s.cellBad) : "",
                      ].join(" ");
                      return (
                        <td key={d.date} className={cls} onDragEnter={(e) => onCellOver(e, c)} onDragOver={(e) => onCellOver(e, c)} onDrop={(e) => onCellDrop(e, c)}>
                          {mine ? t("bk.mv.yours") : taken ? t("bk.mv.booked") : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
