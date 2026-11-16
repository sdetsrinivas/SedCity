"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { cancelPaySession, getPaySession, type GatewayMessage } from "@/mock/endpoints/astheenpay";
import s from "./GatewayFrame.module.css";

export const checkoutUrl = (session: string, view: "frame" | "window") => `/pay/astheenpay/checkout?session=${session}&view=${view}`;

/**
 * Hosts the AstheenPay checkout on the paying page (water bill, property tax).
 * FRM-01: by default it runs in a same-origin <iframe id="astheenpay-frame">; everything inside (card fields,
 * OTP modal) belongs to the frame's document, so page-level locators do not see it.
 * DLG-15: "Open in a new window" moves the checkout to a `window.open` popup; this page then waits, polls
 * `popup.closed`, and continues when the popup posts its result.
 */
export function GatewayFrame({ session, onResult }: { session: string; onResult: (status: "paid" | "cancelled" | "closed") => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<"frame" | "window">("frame");
  const [blocked, setBlocked] = useState(false);
  const [height, setHeight] = useState(560);
  const popup = useRef<Window | null>(null);
  const section = useRef<HTMLElement>(null);
  const done = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    section.current?.scrollIntoView?.({ block: "start" });
  }, []);

  useEffect(() => {
    const finish = (status: "paid" | "cancelled" | "closed") => {
      if (done.current) return;
      done.current = true;
      onResultRef.current(status);
    };
    const onMessage = (e: MessageEvent<GatewayMessage>) => {
      if (e.origin !== window.location.origin || e.data?.source !== "astheenpay" || e.data.session !== session) return;
      if (e.data.type === "resize" && e.data.height) setHeight(Math.max(420, Math.ceil(e.data.height)));
      // Trust the stored session, not the message: only a session marked paid by the gateway counts.
      if (e.data.type === "result") finish(getPaySession(session)?.status === "paid" ? "paid" : "cancelled");
    };
    window.addEventListener("message", onMessage);
    const poll = setInterval(() => {
      if (popup.current?.closed) {
        popup.current = null;
        if (getPaySession(session)?.status === "paid") finish("paid");
        else {
          cancelPaySession(session);
          finish("closed");
        }
      }
    }, 500);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(poll);
    };
  }, [session]);

  const openWindow = () => {
    const w = window.open(checkoutUrl(session, "window"), "astheenpay", "popup,width=480,height=760");
    if (!w) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    popup.current = w;
    setMode("window");
  };

  const payHere = () => {
    const w = popup.current;
    popup.current = null;
    w?.close();
    setMode("frame");
  };

  return (
    <section ref={section} id="astheenpay" className={`card ${s.gateway}`} aria-labelledby="ap-host-title">
      <div className="card-title">
        <h2 id="ap-host-title"><Icon name="lock" size={18} /> {t("ap.hostTitle")}</h2>
        {mode === "frame" && (
          <button type="button" className="btn btn-ghost" onClick={openWindow}>
            {t("ap.hostOpenWindow")} <Icon name="external" size={16} />
          </button>
        )}
      </div>
      <div className="card-body">
        <p className="muted small">{t("ap.hostNote")}</p>
        {blocked && <div className="alert alert-error" role="alert">{t("ap.hostBlocked")}</div>}
        {mode === "frame" ? (
          <iframe
            id="astheenpay-frame"
            className={s.frame}
            title={t("ap.hostFrameTitle")}
            src={checkoutUrl(session, "frame")}
            style={{ height }}
          />
        ) : (
          <div className={s.waiting} role="status">
            <span className={s.spinner} aria-hidden="true" />
            <p>{t("ap.hostWaiting")}</p>
            <div className={s.waitingActions}>
              <button type="button" className="btn btn-primary" onClick={() => popup.current?.focus()}>{t("ap.hostFocus")}</button>
              <button type="button" className="btn btn-outline" onClick={payHere}>{t("ap.hostPayHere")}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
