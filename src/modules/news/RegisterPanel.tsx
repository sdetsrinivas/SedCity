"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/lib/useSession";
import { pushSms } from "@/lib/sms";
import { formatDate } from "@/lib/format";
import { checkSeats, eventBySlug, submitEventRegistration, type SeatInfo } from "@/mock/endpoints/news";
import { registrationFor, saveRegistration, type EventRegistration, type RegistrationInput } from "./registration";
import { RegistrationForm } from "./RegistrationForm";
import s from "./News.module.css";

type Phase = "idle" | "form" | "done";

/**
 * HYD-03: the Register button is server-rendered and works once the page hydrates, but when the seat
 * check returns (EVENT_SEATS, 1.5s later) the panel renders it under a different React key, so React
 * removes that <button> and inserts a new one with the same id, text and look. A reference taken to
 * the first button is then detached from the document.
 */
export function RegisterPanel({ slug }: { slug: string }) {
  const { t, lang } = useT();
  const event = eventBySlug(slug)!;
  const { session } = useSession();
  const [seats, setSeats] = useState<SeatInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState<EventRegistration | null>(null);
  const [seatsFailed, setSeatsFailed] = useState(false);
  const live = useRef(true);

  const loadSeats = useCallback(() => {
    setSeatsFailed(false);
    checkSeats(event, registrationFor(slug)?.attendees ?? 0).then(
      (info) => live.current && setSeats(info),
      // A failed check is a service error, not a full event: the Register button stays usable
      // (the seats are checked again on submit) and the check can be retried.
      () => live.current && setSeatsFailed(true),
    );
  }, [event, slug]);

  useEffect(() => {
    live.current = true;
    const own = registrationFor(slug);
    if (own) {
      setDone(own);
      setPhase("done");
    }
    loadSeats();
    return () => { live.current = false; };
  }, [slug, loadSeats]);

  const submit = async (input: RegistrationInput) => {
    const own = registrationFor(slug)?.attendees ?? 0;
    const res = await submitEventRegistration(event, input.attendees, own);
    if (!res.accepted) return false;
    const reg = saveRegistration(slug, input);
    pushSms(input.mobile, t("ev.sms", { ref: reg.ref, title: pick(event.title, lang), date: formatDate(event.eventDate), time: event.time, count: input.attendees }));
    setDone(reg);
    setSeats((prev) => (prev ? { ...prev, left: Math.max(0, prev.left - input.attendees) } : prev));
    setPhase("done");
    return true;
  };

  return (
    <section className={`card ${s.registerPanel}`} aria-labelledby="ev-register-title">
      <div className="card-title"><h2 id="ev-register-title">{t("ev.registration")}</h2></div>
      <div className="card-body">
        {seatsFailed ? (
          <div className={`alert alert-error ${s.seatsError}`} role="alert">
            <span>{t("ev.seatsError")}</span>
            <button type="button" className="btn btn-outline" onClick={loadSeats}>{t("ev.seatsRetry")}</button>
          </div>
        ) : (
          <p className={s.seats} role="status">
            <Icon name="users" size={18} />
            {seats === null
              ? t("ev.checkingSeats")
              : seats.left > 0
                ? t("ev.seatsLeft", { left: seats.left, capacity: seats.capacity })
                : t("ev.full")}
          </p>
        )}

        {phase === "done" && done ? (
          <div className={s.registered}>
            <p className={s.registeredTitle}><Icon name="check" size={18} /> {t("ev.registered", { title: pick(event.title, lang) })}</p>
            <dl className={s.regFacts}>
              <dt>{t("ev.regNo")}</dt><dd className={s.regNo}>{done.ref}</dd>
              <dt>{t("ev.name")}</dt><dd>{done.name}</dd>
              <dt>{t("ev.attendees")}</dt><dd>{done.attendees}</dd>
            </dl>
            <p className="small muted">{t("ev.showAtVenue", { mobile: done.mobile })}</p>
          </div>
        ) : phase === "form" ? (
          <RegistrationForm
            seatsLeft={seats?.left ?? null}
            defaults={{ name: session ? pick({ en: session.name, ta: session.nameTa }, lang) : "", mobile: session?.mobile ?? "" }}
            onCancel={() => setPhase("idle")}
            onSubmit={submit}
          />
        ) : (
          <>
            <p className="small muted">{t("ev.registerIntro")}</p>
            {/* HYD-03: new key once the seat check returns → a new element replaces the first one. */}
            <button
              key={seats === null ? "checking" : "checked"}
              type="button"
              id="ev-register"
              className="btn btn-primary btn-block"
              disabled={seats !== null && seats.left === 0}
              onClick={() => setPhase("form")}
            >
              {t("ev.register")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
