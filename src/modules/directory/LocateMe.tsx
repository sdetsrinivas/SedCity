"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { delayFor } from "@/mock/api";
import { findNearestOffices, officeById, type LatLng, type NearbyOffices } from "@/mock/endpoints/directory";
import { formatKm } from "./offices";
import s from "./Offices.module.css";

export interface Located {
  from: LatLng;
  result: NearbyOffices;
}

type Status = "idle" | "locating" | "searching" | "denied" | "unavailable" | "failed";

/**
 * DLG-17: “Use my current location” asks the browser for the position (`navigator.geolocation`), which
 * makes the browser show its own location permission prompt — not part of the page, so it cannot be
 * clicked with page locators. With the position, the offices are ranked by distance (OFFICE_NEAREST) and
 * the nearest one is named and chosen. Refused permission, no position within LOCATE_TIMEOUT, or a failed
 * ranking each show an error instead.
 */
export function LocateMe({ located, onLocated, onClear }: { located: Located | null; onLocated: (l: Located) => void; onClear: () => void }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<Status>("idle");
  const attempt = useRef(0);
  const busy = status === "locating" || status === "searching";

  const locate = () => {
    if (busy) return;
    const id = ++attempt.current;
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== attempt.current) return;
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStatus("searching");
        findNearestOffices(from).then(
          (result) => {
            if (id !== attempt.current) return;
            setStatus("idle");
            onLocated({ from, result });
          },
          () => id === attempt.current && setStatus("failed"),
        );
      },
      (err) => {
        if (id !== attempt.current) return;
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: delayFor("LOCATE_TIMEOUT") },
    );
  };

  const clear = () => {
    attempt.current++;
    setStatus("idle");
    onClear();
  };

  const nearest = located ? officeById(located.result.ranked[0].id) : undefined;
  const error = status === "denied" || status === "unavailable" || status === "failed";

  return (
    <div className={s.locate}>
      <div className={s.locateRow}>
        <button type="button" className="btn btn-primary" onClick={locate} disabled={busy} aria-busy={busy}>
          <Icon name="locate" size={18} />
          {t("off.locate")}
        </button>
        {located && !busy && (
          <button type="button" className="link-btn" onClick={clear}>{t("off.clearLocation")}</button>
        )}
        <span className={s.locateStatus} role="status">
          {status === "locating" ? t("off.locating") : status === "searching" ? t("off.searching") : ""}
        </span>
      </div>
      {error && (
        <div className={`alert alert-error ${s.locateMsg}`} role="alert">
          {t(status === "denied" ? "off.denied" : status === "failed" ? "off.failed" : "off.unavailable")}
        </div>
      )}
      {!error && !busy && located && nearest && (
        <>
          {located.result.outside && (
            <div className={`alert alert-info ${s.locateMsg}`}>
              {t("off.outside", { km: formatKm(located.result.fromCentreKm, lang) })}
            </div>
          )}
          <div className={`alert alert-success ${s.locateMsg}`} role="status">
            {t("off.nearest", { name: pick(nearest.name, lang), km: formatKm(located.result.ranked[0].km, lang) })}
          </div>
        </>
      )}
    </div>
  );
}
