"use client";
import { useT } from "@/i18n/client";
import { PURPOSE_MAX } from "./booking";
import s from "./Bookings.module.css";

interface Props {
  ids: { purpose: string; attendees: string; purposeErr: string; attendeesErr: string };
  purpose: string;
  attendees: string;
  capacity: number | null;
  onPurpose: (v: string) => void;
  onAttendees: (v: string) => void;
  purposeError?: string;
  attendeesError?: string;
}

/**
 * TXT-11: the two event fields have no <label>, no aria-label and no name attribute: the placeholder is
 * their only description, and it disappears as soon as something is typed. Their ids are generated per
 * page load (DYN-06).
 */
export function EventDetails({ ids, purpose, attendees, capacity, onPurpose, onAttendees, purposeError, attendeesError }: Props) {
  const { t } = useT();
  return (
    <div className={s.eventFields}>
      <div className="field">
        <input
          id={ids.purpose}
          className={`input ${s.wide}`}
          autoComplete="off"
          maxLength={PURPOSE_MAX + 20}
          placeholder={t("bk.purposePh")}
          value={purpose}
          aria-invalid={!!purposeError || undefined}
          aria-describedby={purposeError ? ids.purposeErr : undefined}
          onChange={(e) => onPurpose(e.target.value)}
        />
        {purposeError && <span className="error" id={ids.purposeErr}>{purposeError}</span>}
      </div>
      <div className="field">
        <input
          id={ids.attendees}
          className={`input ${s.short}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={capacity ?? undefined}
          placeholder={t("bk.attendeesPh")}
          value={attendees}
          aria-invalid={!!attendeesError || undefined}
          aria-describedby={attendeesError ? ids.attendeesErr : undefined}
          onChange={(e) => onAttendees(e.target.value)}
        />
        {attendeesError && <span className="error" id={ids.attendeesErr}>{attendeesError}</span>}
      </div>
    </div>
  );
}
