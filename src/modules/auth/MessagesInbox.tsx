"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { listSms, markAllRead, SMS_EVENT, type Sms } from "@/lib/sms";
import { maskMobile } from "@/lib/mask";
import s from "./Auth.module.css";

const fmt = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** OTH-25: client-only "SMS Copies" inbox; updates live when another tab sends an OTP. */
export default function MessagesInbox() {
  const { t } = useT();
  const [items, setItems] = useState<Sms[]>([]);
  useEffect(() => {
    const sync = () => setItems(listSms());
    sync();
    window.addEventListener(SMS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(SMS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  if (!items.length) return <p className="muted">{t("sms.empty")}</p>;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" className="btn btn-outline" onClick={markAllRead}>{t("sms.markRead")}</button>
      </div>
      <ul className={s.smsList}>
        {items.map((m) => (
          <li key={m.id} className={`${s.sms} ${m.read ? "" : s.smsUnread}`}>
            <div className={s.smsMeta}>
              <span>{t("sms.from")}: {m.sender} · {t("sms.to")}: {maskMobile(m.to)}</span>
              <time dateTime={m.at}>{fmt(m.at)}</time>
            </div>
            <p style={{ margin: 0 }}>{m.body}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
