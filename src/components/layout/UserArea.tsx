"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { useSession } from "@/lib/useSession";
import { clearSession } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import s from "./Header.module.css";

export function UserArea() {
  const { t, lang } = useT();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!session) {
    return (
      <div className={s.userArea}>
        <Link href="/register" className="btn btn-ghost">{t("nav.register")}</Link>
        <Link href="/login" className="btn btn-primary">{t("nav.login")}</Link>
      </div>
    );
  }

  const displayName = lang === "ta" ? session.nameTa : session.name;
  return (
    <div className={s.userArea} ref={ref}>
      <button type="button" className={s.userChip} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={s.avatar} aria-hidden="true">{session.name.charAt(0)}</span>
        <span className={s.userName}>{displayName}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className={s.userMenu} role="menu">
          <div className={s.userMenuHead}>
            <span className="small muted">{t("nav.signedInAs")}</span>
            <strong>{session.username}</strong>
          </div>
          {session.role === "officer" ? (
            <Link role="menuitem" href="/officer/queue" onClick={() => setOpen(false)}><Icon name="file" size={16} /> {t("nav.officerQueue")}</Link>
          ) : (
            <Link role="menuitem" href="/dashboard" onClick={() => setOpen(false)}><Icon name="home" size={16} /> {t("nav.dashboard")}</Link>
          )}
          <Link role="menuitem" href="/messages" onClick={() => setOpen(false)}><Icon name="sms" size={16} /> {t("nav.messages")}</Link>
          <button role="menuitem" type="button" onClick={() => { clearSession(); setOpen(false); router.push("/login?reason=signout"); }}>
            <Icon name="logout" size={16} /> {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
