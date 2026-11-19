"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { loadOfficeMap, type LatLng } from "@/mock/endpoints/directory";
import { OFFICE_MAP_URL, isMapEvent, type MapState } from "./mapMessages";
import s from "./Offices.module.css";

const readTheme = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** The page's theme (html[data-theme]), updated when the theme switch flips it. */
function usePageTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(readTheme());
    const mo = new MutationObserver(() => setTheme(readTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/**
 * FRM-04: the map is a same-origin <iframe> that is not in the page at first. A “Loading map…”
 * placeholder holds its place for MAP_IFRAME (5s); only then is the <iframe> element inserted, with a
 * title but no id or name. Everything on the map (office markers, the highlighted office, “You are here”)
 * lives in the frame's own document. Page and map talk through postMessage: choosing a marker chooses
 * that office on the page; choosing an office on the page highlights it on the map. The frame is
 * re-created when the language changes (its text comes from the server) but not when the theme changes:
 * the theme is sent in the same message, so the map recolours in place without a reload.
 */
export function OfficeMapFrame({ selectedId, user, onSelect }: { selectedId: string | null; user: LatLng | null; onSelect: (id: string) => void }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const theme = usePageTheme();
  const latest = useRef({ selectedId, user, onSelect, theme });
  latest.current = { selectedId, user, onSelect, theme };

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadOfficeMap().then(
      () => !cancelled && setStatus("ready"),
      () => !cancelled && setStatus("failed"),
    );
    return () => { cancelled = true; };
  }, [attempt]);

  const post = () => {
    const win = frame.current?.contentWindow;
    if (!win || !ready.current) return;
    const msg: MapState = { source: "amc-offices", type: "state", selectedId: latest.current.selectedId, user: latest.current.user, theme: latest.current.theme };
    win.postMessage(msg, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || !isMapEvent(e.data)) return;
      if (e.data.type === "ready") {
        ready.current = true;
        post();
      } else if (e.data.type === "select") latest.current.onSelect(e.data.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(post, [selectedId, user, theme]);

  return (
    <section className={`card ${s.mapCard}`} aria-labelledby="office-map-title">
      <div className="card-title">
        <h2 id="office-map-title">{t("off.mapTitle")}</h2>
      </div>
      <div className={s.mapBody}>
        {status === "loading" && (
          <div className={s.mapPlaceholder}>
            <span className={s.spinner} aria-hidden="true" />
            {t("off.mapLoading")}
          </div>
        )}
        {status === "failed" && (
          <div className={`alert alert-error ${s.mapError}`} role="alert">
            <span>{t("off.mapError")}</span>
            <button type="button" className="btn btn-outline" onClick={() => setAttempt((n) => n + 1)}>{t("dir.retry")}</button>
          </div>
        )}
        {status === "ready" && (
          // FRM-04: inserted only now; no id or name. Re-created when the language changes.
          <iframe
            key={lang}
            ref={frame}
            src={OFFICE_MAP_URL}
            title={t("off.mapFrameTitle")}
            className={s.mapFrame}
          />
        )}
      </div>
    </section>
  );
}
