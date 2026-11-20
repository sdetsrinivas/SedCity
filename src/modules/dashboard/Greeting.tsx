"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { formatDateTime } from "@/lib/format";
import { previousSignIn } from "@/lib/signIns";
import { useSession } from "@/lib/useSession";

const greetingKey = (d: Date) => (d.getHours() < 12 ? "greeting.morning" : d.getHours() < 17 ? "greeting.afternoon" : "greeting.evening");

/**
 * HYD-02: the server cannot know who is signed in (the session is in browser storage) or the browser's
 * time of day, so the first HTML has a plain “Welcome” and “Last sign-in: —”. After hydration the same
 * elements change to “Good evening, Meena Rajendran” and the previous sign-in on this device.
 */
export function Greeting() {
  const { t, lang } = useT();
  const { session, ready } = useSession();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const citizen = ready && now && session?.role === "citizen" ? session : null;
  const last = citizen ? previousSignIn(citizen.username, citizen.loginAt) : null;
  return (
    <>
      <h1 id="dash-greeting">
        {citizen ? `${t(greetingKey(now!))}, ${lang === "ta" ? citizen.nameTa : citizen.name}` : t("dash.welcome")}
      </h1>
      {(!ready || citizen) && (
        <p id="dash-last-signin" className="muted" style={{ margin: "6px 0 0" }}>
          {!citizen ? t("dash.lastSignIn", { when: "—" }) : last ? t("dash.lastSignIn", { when: formatDateTime(last) }) : t("dash.firstSignIn")}
        </p>
      )}
    </>
  );
}
