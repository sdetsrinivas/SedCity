"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { useSession } from "@/lib/useSession";
import { clearSession } from "@/lib/session";
import { limitFor } from "@/mock/api";
import { Modal } from "@/components/ui/Modal";

const ACTIVITY = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * DLG-05: after SESSION_WARN of inactivity a portal modal warns of sign-out and counts down
 * SESSION_COUNTDOWN. Activity while the modal is open does NOT reset it — only the button does.
 * Both are time limits (limitFor): the `scale` override does not shorten them, only a by-name override.
 */
export function SessionWatcher() {
  const { session } = useSession();
  const { t } = useT();
  const router = useRouter();
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef(false);
  warningRef.current = warning;

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setSecondsLeft(Math.ceil(limitFor("SESSION_COUNTDOWN") / 1000));
      setWarning(true);
    }, limitFor("SESSION_WARN"));
  }, []);

  useEffect(() => {
    if (!session) {
      setWarning(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    armIdle();
    const onActivity = () => { if (!warningRef.current) armIdle(); };
    ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [session, armIdle]);

  const signOut = useCallback((reason: "timeout" | "signout") => {
    setWarning(false);
    clearSession();
    router.push(`/login?reason=${reason}`);
  }, [router]);

  useEffect(() => {
    if (!warning) return;
    if (secondsLeft <= 0) { signOut("timeout"); return; }
    const id = setTimeout(() => setSecondsLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [warning, secondsLeft, signOut]);

  return (
    <Modal
      open={warning}
      title={t("session.title")}
      dismissible={false}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={() => signOut("signout")}>{t("session.logout")}</button>
          <button type="button" className="btn btn-primary" onClick={() => { setWarning(false); armIdle(); }}>{t("session.stay")}</button>
        </>
      }
    >
      <p>{t("session.body", { seconds: secondsLeft })}</p>
    </Modal>
  );
}
