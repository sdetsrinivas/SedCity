"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { addDays, formatDate, formatINR, todayISO } from "@/lib/format";
import { pushSms } from "@/lib/sms";
import type { Session } from "@/lib/session";
import { fetchSlots, heldSlots, submitBooking } from "@/mock/endpoints/bookings";
import {
  EMPTY_BOOKING, SLOT_HOURS, VENUES, amenityById, bookingFees, dayStatus, hhmm, validateBooking, venueById,
  type BookingDraft, type BookingErrors, type BookingField, type HeldSlots,
} from "./booking";
import { BookingCalendar } from "./BookingCalendar";
import { SlotMap } from "./SlotMap";
import { AmenityTiles } from "./AmenityTiles";
import { EventDetails } from "./EventDetails";
import { ConfirmDialog, type ConfirmSummary } from "./ConfirmDialog";
import { BookingAcknowledgement, type BookingAck } from "./BookingAcknowledgement";
import s from "./Bookings.module.css";

type Avail =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; slots: number[]; taken: number[]; load: number };

const FIELD_ORDER: BookingField[] = ["venue", "date", "slots", "purpose", "attendees"];

/**
 * DYN-06: every id on this form is made from `uid`, a random prefix the server draws for each page load
 * (e.g. "kq3f9x2" + "c"), and the form's own classes are CSS-module names whose hash changes with every
 * build. Only the visible text, labels, placeholders and roles stay the same between loads.
 */
export function BookingForm({ uid, session }: { uid: string; session: Session }) {
  const { t, lang } = useT();
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  const ids = useMemo(() => {
    const keys = ["venue", "date", "dateHelp", "purpose", "attendees", "purposeErr", "attendeesErr", "slots", "summary", "s1", "s2", "s3", "s4", "fees", "confirm"] as const;
    return Object.fromEntries(keys.map((k, i) => [k, `${uid}${(i + 10).toString(36)}`])) as Record<(typeof keys)[number], string>;
  }, [uid]);

  const [today] = useState(todayISO);
  const [held, setHeld] = useState<HeldSlots[]>(() => heldSlots());
  const [d, setD] = useState<BookingDraft>(EMPTY_BOOKING);
  const [avail, setAvail] = useState<Avail>({ state: "idle" });
  const [reload, setReload] = useState(0);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<null | "error" | "taken">(null);
  const [ack, setAck] = useState<BookingAck | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const mobile = session.mobile.replace(/\D/g, "").slice(-10);

  const venue = venueById(d.venue);

  // OTH-21: availability for the chosen venue and day (BOOKING_SLOTS); an older answer is ignored.
  useEffect(() => {
    if (!d.venue || !d.date) {
      setAvail({ state: "idle" });
      return;
    }
    let live = true;
    setAvail({ state: "loading" });
    fetchSlots(d.venue, d.date)
      .then((r) => { if (live) setAvail({ state: "ready", slots: r.slots, taken: r.taken, load: Date.now() }); })
      .catch(() => { if (live) setAvail({ state: "error" }); });
    return () => { live = false; };
  }, [d.venue, d.date, reload]);

  const clearError = (...keys: BookingField[]) =>
    setErrors((e) => (keys.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k as BookingField))) : e));

  const setVenue = (id: string) => {
    const v = venueById(id);
    setD((o) => ({
      ...o,
      venue: id,
      date: v && o.date && !dayStatus(v, o.date, today, held) ? o.date : null,
      slots: [],
      amenities: v ? o.amenities.filter((a) => v.amenities.includes(a)) : [],
    }));
    clearError("venue", "slots");
  };
  const setDate = (iso: string) => {
    setD((o) => ({ ...o, date: iso, slots: [] }));
    clearError("date", "slots");
  };
  const setSlots = (slots: number[]) => {
    setD((o) => ({ ...o, slots }));
    clearError("slots");
  };

  const fees = venue ? bookingFees(venue, d.slots, d.amenities) : null;
  const run = [...d.slots].sort((a, b) => a - b);
  const timeText = run.length ? `${hhmm(run[0])} – ${hhmm(run[run.length - 1] + SLOT_HOURS)}` : "";
  const amenityText = d.amenities.length ? d.amenities.map((a) => pick(amenityById(a)!, lang)).join(", ") : t("bk.none");
  const msg = (k: BookingField) => (errors[k] ? t(errors[k]!.key, errors[k]!.vars) : undefined);

  const review = () => {
    setFailed(null);
    const errs = validateBooking(d, today, held);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setConfirming(true);
  };

  const book = async () => {
    if (!venue || !d.date || !fees) return;
    setBusy(true);
    setFailed(null);
    try {
      const res = await submitBooking({
        venue: d.venue, date: d.date, slots: run, amenities: d.amenities, purpose: d.purpose.trim(), attendees: Number(d.attendees),
      });
      if (!res.ok) {
        // Someone else took a slot meanwhile: drop the choice and load the day again.
        setFailed("taken");
        setD((o) => ({ ...o, slots: [] }));
        setHeld(heldSlots());
        setReload((n) => n + 1);
        return;
      }
      const ref = nextReference("booking");
      const venueName = pick(venue, lang);
      const payBy = [addDays(today, res.payWithinDays), addDays(d.date, -1)].sort()[0];
      saveApplication({
        ref, service: "booking", title: t("bk.appTitle", { venue: venueName, date: formatDate(d.date) }),
        submittedAt: new Date().toISOString(), status: "Submitted", applicant: session.name, amount: fees.total,
        details: {
          venue: d.venue, date: d.date, slots: run.join(","), start: hhmm(run[0]), end: hhmm(run[run.length - 1] + SLOT_HOURS),
          hours: String(fees.hours), amenities: d.amenities.join(","), purpose: d.purpose.trim(), attendees: String(Number(d.attendees)),
          mobile, hire: String(fees.hire), amenityFee: String(fees.amenities), deposit: String(fees.deposit), payBy,
        },
      });
      setHeld(heldSlots());
      pushSms(mobile, t("bk.sms", { ref, venue: venueName, date: formatDate(d.date), time: timeText, total: formatINR(fees.total), payBy: formatDate(payBy) }));
      setAck({ ref, venue: venueName, date: d.date, time: timeText, amenities: amenityText, total: fees.total, payBy, mobile });
      window.scrollTo({ top: 0 });
    } catch {
      setFailed("error");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setD(EMPTY_BOOKING); setErrors({}); setFailed(null); setAck(null); setHeld(heldSlots());
  };

  if (ack) return <BookingAcknowledgement ack={ack} onRestart={restart} />;

  const summary: ConfirmSummary | null = venue && d.date && fees
    ? { venue: pick(venue, lang), date: formatDate(d.date), time: timeText, amenities: amenityText, purpose: d.purpose.trim(), attendees: d.attendees.trim(), fees }
    : null;
  const closedDay = venue && venue.closedDay >= 0
    ? new Date(2024, 0, 7 + venue.closedDay).toLocaleDateString(locale, { weekday: "long" }) // 7 Jan 2024 was a Sunday
    : null;
  const errorKeys = FIELD_ORDER.filter((k) => errors[k]);

  return (
    <div className={s.form}>
      {failed && (
        <div className="alert alert-error" role="alert">{t(failed === "taken" ? "bk.errTaken" : "bk.errSubmit")}</div>
      )}
      {errorKeys.length > 0 && (
        <div ref={summaryRef} id={ids.summary} tabIndex={-1} className="alert alert-error" role="alert">
          <strong>{t("bk.errSummary")}</strong>
          <ul className={s.errList}>{errorKeys.map((k) => <li key={k}>{msg(k)}</li>)}</ul>
        </div>
      )}

      <section className={`card ${s.section}`} aria-labelledby={ids.s1}>
        <div className="card-title"><h2 id={ids.s1}>{t("bk.s1")}</h2></div>
        <div className="card-body">
          <div className={s.pair}>
            <div className="field">
              <label htmlFor={ids.venue}>{t("bk.venue")}</label>
              <select id={ids.venue} className="input" value={d.venue} aria-invalid={!!errors.venue || undefined} onChange={(e) => setVenue(e.target.value)}>
                <option value="">{t("bk.venuePick")}</option>
                {VENUES.map((v) => <option key={v.id} value={v.id}>{pick(v, lang)}</option>)}
              </select>
              {errors.venue && <span className="error">{msg("venue")}</span>}
            </div>
            <div className="field">
              <label htmlFor={ids.date}>{t("bk.date")}</label>
              <BookingCalendar
                id={ids.date} venue={venue} value={d.date} onChange={setDate} today={today} held={held}
                invalid={!!errors.date} describedBy={ids.dateHelp}
              />
              <span className={errors.date ? "error" : "help"} id={ids.dateHelp}>{errors.date ? msg("date") : t(venue ? "bk.dateHelp" : "bk.dateNeedsVenue")}</span>
            </div>
          </div>
          {venue && (
            <dl className={s.venueFacts}>
              <div><dt>{t("bk.address")}</dt><dd>{lang === "ta" ? venue.addressTa : venue.addressEn}</dd></div>
              <div><dt>{t("bk.capacity")}</dt><dd>{t("bk.capacityN", { n: venue.capacity })}</dd></div>
              <div><dt>{t("bk.rate")}</dt><dd>{t("bk.rateN", { rate: formatINR(venue.rate, true) })}</dd></div>
              <div><dt>{t("bk.deposit")}</dt><dd>{formatINR(venue.deposit, true)}</dd></div>
              <div><dt>{t("bk.closed")}</dt><dd>{closedDay ? t("bk.closedOn", { day: closedDay }) : t("bk.openAllDays")}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby={ids.s2}>
        <div className="card-title"><h2 id={ids.s2}>{t("bk.s2")}</h2></div>
        <div className="card-body" id={ids.slots}>
          {avail.state === "idle" && <p className="muted">{t("bk.slotsWait")}</p>}
          {avail.state === "loading" && <p className={s.loading} role="status">{t("bk.slotsLoading")}</p>}
          {avail.state === "error" && (
            <div className="alert alert-error" role="alert">
              {t("bk.slotsError")}{" "}
              <button type="button" className="link-btn" onClick={() => setReload((n) => n + 1)}>{t("bk.retry")}</button>
            </div>
          )}
          {avail.state === "ready" && d.date && (
            <SlotMap
              key={`${d.venue}|${d.date}|${avail.load}`}
              uid={`${uid}m${avail.load.toString(36)}`}
              dateLabel={formatDate(d.date)}
              slots={avail.slots}
              taken={avail.taken}
              value={d.slots}
              onChange={setSlots}
              invalid={!!errors.slots}
            />
          )}
          {errors.slots && <p className="error small">{msg("slots")}</p>}
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby={ids.s3}>
        <div className="card-title"><h2 id={ids.s3}>{t("bk.s3")}</h2></div>
        <div className="card-body">
          {venue
            ? <AmenityTiles venue={venue} value={d.amenities} onChange={(a) => setD((o) => ({ ...o, amenities: a }))} />
            : <p className="muted">{t("bk.amenitiesWait")}</p>}
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby={ids.s4}>
        <div className="card-title"><h2 id={ids.s4}>{t("bk.s4")}</h2></div>
        <div className="card-body">
          <EventDetails
            ids={ids}
            purpose={d.purpose}
            attendees={d.attendees}
            capacity={venue?.capacity ?? null}
            onPurpose={(v) => { setD((o) => ({ ...o, purpose: v })); clearError("purpose"); }}
            onAttendees={(v) => { setD((o) => ({ ...o, attendees: v })); clearError("attendees"); }}
            purposeError={msg("purpose")}
            attendeesError={msg("attendees")}
          />
        </div>
      </section>

      <section className={`card ${s.section}`} aria-labelledby={ids.fees}>
        <div className="card-title"><h2 id={ids.fees}>{t("bk.feesTitle")}</h2></div>
        <div className="card-body">
          <dl className={s.fees}>
            <div><dt>{fees && fees.hours ? t("bk.hireN", { hours: fees.hours, rate: formatINR(venue!.rate, true) }) : t("bk.hire")}</dt><dd>{formatINR(fees?.hire ?? 0)}</dd></div>
            <div><dt>{t("bk.amenities")}</dt><dd>{formatINR(fees?.amenities ?? 0)}</dd></div>
            <div><dt>{t("bk.depositRefundable")}</dt><dd>{formatINR(fees?.deposit ?? 0)}</dd></div>
            <div className={s.feesTotal}><dt>{t("bk.total")}</dt><dd>{formatINR(fees?.total ?? 0)}</dd></div>
          </dl>
          {d.amenities.length > 0 && <p className="small muted">{t("bk.amenitiesChosen", { list: amenityText })}</p>}
          <div className={s.actions}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={review}>
              {busy ? t("bk.booking") : t("bk.review")}
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        titleId={ids.confirm}
        open={confirming}
        summary={summary}
        onClose={(ok) => {
          setConfirming(false);
          if (ok) void book();
        }}
      />
    </div>
  );
}
