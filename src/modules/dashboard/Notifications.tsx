"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { limitFor } from "@/mock/api";
import { deleteNotices, markNoticesRead } from "@/mock/endpoints/dashboard";
import type { Notice } from "./data";
import type { HandleProps } from "./WidgetBoard";
import { WidgetCard } from "./WidgetCard";
import { Snackbar } from "./Snackbar";
import s from "./Dashboard.module.css";

interface Pending { ids: string[]; timer: number }

/**
 * Notifications card.
 * CHK-06: the "Select all" box above the list is a native checkbox whose mixed state (some, not all,
 * selected) exists only as the `indeterminate` DOM property, set from an effect: there is no attribute
 * for it and `checked` stays false. Clicking it while mixed selects everything.
 * DLG-11: Delete hides the selected notifications at once and shows a snackbar with Undo for UNDO_WINDOW
 * (6s); only when it closes is the deletion saved. A second Delete saves the first one straight away.
 * DYN-03: until the data arrives the list holds four placeholder <li>s (aria-busy on the card body).
 */
export function Notifications({ username, notices, handle }: { username: string; notices: Notice[] | null; handle: HandleProps }) {
  const { t, lang } = useT();
  const uid = useId();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [snack, setSnack] = useState<{ count: number } | null>(null);
  const [note, setNote] = useState("");
  const pending = useRef<Pending | null>(null);
  const allBox = useRef<HTMLInputElement>(null);

  const visible = (notices ?? []).filter((n) => !hidden.has(n.id));
  const chosen = visible.filter((n) => sel.has(n.id));
  const unread = visible.filter((n) => n.unread && !read.has(n.id));
  const all = visible.length > 0 && chosen.length === visible.length;

  // CHK-06: the mixed state is a property only.
  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = chosen.length > 0 && !all;
  }, [chosen.length, all]);

  /** Saves the deletion waiting in the snackbar (its window closed, or another Delete came). */
  const settle = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    deleteNotices(username, p.ids);
    setSnack(null);
  }, [username]);

  // Leaving the page keeps the deletion, as if the window had closed.
  useEffect(() => {
    window.addEventListener("pagehide", settle);
    return () => { window.removeEventListener("pagehide", settle); settle(); };
  }, [settle]);

  const remove = () => {
    if (chosen.length === 0) return;
    settle();
    const ids = chosen.map((n) => n.id);
    pending.current = { ids, timer: window.setTimeout(settle, limitFor("UNDO_WINDOW")) };
    setHidden((h) => new Set([...h, ...ids]));
    setSel(new Set());
    setSnack({ count: ids.length });
    setNote("");
  };

  const undo = () => {
    const p = pending.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    setHidden((h) => new Set([...h].filter((id) => !p.ids.includes(id))));
    setSnack(null);
    setNote(t("dash.nt.restored", { n: p.ids.length }));
    allBox.current?.focus();
  };

  const markRead = () => {
    const ids = chosen.filter((n) => n.unread && !read.has(n.id)).map((n) => n.id);
    if (ids.length === 0) return;
    markNoticesRead(username, ids);
    setRead((r) => new Set([...r, ...ids]));
    setSel(new Set());
    setNote(t("dash.nt.marked", { n: ids.length }));
  };

  const toggle = (id: string) => setSel((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <WidgetCard
      title={t("dash.nt.title")}
      handle={handle}
      busy={notices === null}
      badge={notices && unread.length > 0 ? <span className="badge">{t("dash.nt.unread", { n: unread.length })}</span> : undefined}
    >
      <div className={s.ntBar}>
        <label className="check">
          <input
            ref={allBox}
            type="checkbox"
            id="notif-select-all"
            checked={all}
            disabled={visible.length === 0}
            onChange={() => setSel(all ? new Set() : new Set(visible.map((n) => n.id)))}
          />
          <span>{t("dash.nt.selectAll")}</span>
        </label>
        <div className={s.ntActions}>
          <button type="button" className="btn btn-outline" disabled={chosen.every((n) => !n.unread || read.has(n.id))} onClick={markRead}>
            {t("dash.nt.markRead")}
          </button>
          <button type="button" className="btn btn-outline" disabled={chosen.length === 0} onClick={remove}>
            {t("dash.nt.delete")}
          </button>
        </div>
      </div>
      <ul className={s.ntList}>
        {notices === null
          ? [0, 1, 2, 3].map((i) => (
            <li key={i} className={s.ntItem}>
              <span className="skeleton" style={{ width: 18, height: 18 }} />
              <span className={s.skelLines}>
                <span className="skeleton" style={{ height: 14, width: `${88 - i * 10}%` }} />
                <span className="skeleton" style={{ height: 12, width: 110 }} />
              </span>
            </li>
          ))
          : visible.map((n) => {
            const isNew = n.unread && !read.has(n.id);
            return (
              <li key={n.id} className={`${s.ntItem} ${isNew ? s.ntNew : ""}`}>
                <input type="checkbox" id={`${uid}${n.id}`} checked={sel.has(n.id)} onChange={() => toggle(n.id)} />
                <label htmlFor={`${uid}${n.id}`} className={s.ntText}>
                  <span>{pick(n.text, lang)}</span>
                  <span className="small muted">
                    {isNew && <span className={s.ntDot}>{t("dash.nt.new")}</span>}
                    <time dateTime={n.at}>{formatDateTime(n.at)}</time>
                  </span>
                </label>
              </li>
            );
          })}
      </ul>
      {notices !== null && visible.length === 0 && <p className="muted">{t("dash.nt.empty")}</p>}
      <p className="small muted" role="status">{note}</p>
      {snack && <Snackbar message={t("dash.nt.deleted", { n: snack.count })} action={t("dash.nt.undo")} onAction={undo} />}
    </WidgetCard>
  );
}
