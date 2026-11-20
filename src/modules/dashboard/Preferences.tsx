"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { useSession } from "@/lib/useSession";
import type { Session } from "@/lib/session";
import { contactEmail, loadPrefs, savePrefs } from "@/mock/endpoints/dashboard";
import s from "./Dashboard.module.css";

/** "dismissed": the prompt was closed without a choice (the browser will ask again next time). */
type Alerts = "unsupported" | "dismissed" | NotificationPermission;

/** The permission as the Permissions API reports it (prompt → "default"); Notification.permission when it is missing. */
async function currentPermission(): Promise<Alerts> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const st = await navigator.permissions.query({ name: "notifications" });
    return st.state === "prompt" ? "default" : st.state;
  } catch {
    return Notification.permission;
  }
}

/** Preferences (signed-in citizens only): paperless billing and due-date alerts in this browser. */
export function Preferences() {
  const { session } = useSession();
  if (session?.role !== "citizen") return null;
  return <Panel session={session} />;
}

function Panel({ session }: { session: Session }) {
  const { t } = useT();
  const [paperless, setPaperless] = useState(false);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setPaperless(loadPrefs(session.username).paperless);
    let live = true;
    currentPermission().then((p) => { if (live) setAlerts(p); });
    return () => { live = false; };
  }, [session.username]);

  // OTH-10: a button with role=switch; its state is only aria-checked (no checkbox, no `checked`).
  const flip = () => {
    const next = !paperless;
    setPaperless(next);
    savePrefs(session.username, { paperless: next });
  };

  // DLG-18: the browser's own notification permission prompt (Notification.requestPermission()); a granted
  // permission shows a sample alert. The starting state comes from the Permissions API: headless Chromium
  // reports Notification.permission as "denied" even when the permission is granted or still to be asked.
  const ask = async () => {
    setAsking(true);
    try {
      const result = await Notification.requestPermission();
      setAlerts(result === "default" ? "dismissed" : result);
      if (result === "granted") {
        try {
          new Notification(t("corp.name"), { body: t("dash.pref.sample"), tag: "amc-alerts" });
        } catch {
          // Some browsers (e.g. Chrome on Android) only allow notifications from a service worker.
        }
      }
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="card" aria-labelledby="dash-prefs-title">
      <div className="card-title"><h2 id="dash-prefs-title">{t("dash.pref.title")}</h2></div>
      <div className="card-body">
        <div className={s.pref}>
          <div>
            <span id="pref-paperless-label" className={s.prefLabel}>{t("dash.pref.paperless")}</span>
            <p id="pref-paperless-desc" className="small muted">
              {paperless ? t("dash.pref.paperlessOn", { email: contactEmail(session) }) : t("dash.pref.paperlessOff")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            id="pref-paperless"
            aria-checked={paperless}
            aria-labelledby="pref-paperless-label"
            aria-describedby="pref-paperless-desc"
            className={s.switch}
            onClick={flip}
          >
            <span className={s.knob} aria-hidden="true" />
          </button>
        </div>
        <div className={s.pref}>
          <div>
            <span className={s.prefLabel}>{t("dash.pref.alerts")}</span>
            <p className="small muted" role="status">
              {alerts === "granted" && t("dash.pref.alertsOn")}
              {alerts === "denied" && t("dash.pref.alertsBlocked")}
              {alerts === "default" && t("dash.pref.alertsOff")}
              {alerts === "dismissed" && t("dash.pref.alertsDismissed")}
              {alerts === "unsupported" && t("dash.pref.alertsUnsupported")}
            </p>
          </div>
          {(alerts === "default" || alerts === "dismissed") && (
            <button type="button" className="btn btn-outline" disabled={asking} onClick={ask}>{t("dash.pref.allow")}</button>
          )}
        </div>
      </div>
    </section>
  );
}
