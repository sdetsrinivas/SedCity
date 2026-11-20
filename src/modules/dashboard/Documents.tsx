"use client";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import { renameDoc } from "@/mock/endpoints/dashboard";
import type { Doc } from "./data";
import type { HandleProps } from "./WidgetBoard";
import { WidgetCard } from "./WidgetCard";
import { DocMenu } from "./DocMenu";
import s from "./Dashboard.module.css";

/** Longest document name accepted on rename. */
export const NAME_MAX = 60;

/**
 * My documents. BTN-08: a document has no visible buttons; its actions (View details, Rename…) are in a
 * custom context menu opened by right-click on the row (`contextmenu`, default menu suppressed) or, on a
 * focused row, the context-menu key or Shift+F10. A left click only focuses the row.
 * DLG-03: Rename… asks for the new name with the native `window.prompt()` (current name pre-filled).
 * Cancel keeps the name; an empty or over-long answer is refused with a message; otherwise the name is
 * saved for this citizen.
 */
export function Documents({ username, docs, handle }: { username: string; docs: Doc[] | null; handle: HandleProps }) {
  const { t, lang } = useT();
  const uid = useId();
  const [names, setNames] = useState<Record<string, string>>({});
  const [menu, setMenu] = useState<{ doc: Doc; x: number; y: number } | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => setNames({}), [docs]);

  const nameOf = (d: Doc) => names[d.id] ?? pick(d.name, lang);
  const menuDoc = useRef<string | null>(null);
  menuDoc.current = menu?.doc.id ?? null;
  /** Escape / Tab put focus back on the document; a click elsewhere leaves it where it went. */
  const closeMenu = useCallback((refocus: boolean) => {
    const id = menuDoc.current;
    setMenu(null);
    if (refocus && id) rows.current.get(id)?.focus();
  }, []);

  const open = (doc: Doc, x: number, y: number) => { setNote(null); setMenu({ doc, x, y }); };
  const onContext = (e: MouseEvent, doc: Doc) => { e.preventDefault(); open(doc, e.clientX, e.clientY); };
  const onKey = (e: KeyboardEvent<HTMLLIElement>, doc: Doc) => {
    if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      open(doc, r.left + 24, r.top + r.height / 2);
    }
  };
  const back = (id: string) => { setMenu(null); rows.current.get(id)?.focus(); };

  const rename = (doc: Doc) => {
    back(doc.id);
    // DLG-03: a native prompt; null when cancelled.
    const answer = window.prompt(t("dash.doc.renamePrompt"), nameOf(doc));
    if (answer === null) return;
    const name = answer.trim().replace(/\s+/g, " ");
    if (!name) { setNote({ text: t("dash.doc.renameEmpty"), error: true }); return; }
    if (name.length > NAME_MAX) { setNote({ text: t("dash.doc.renameLong", { max: NAME_MAX }), error: true }); return; }
    renameDoc(username, doc.id, name);
    setNames((n) => ({ ...n, [doc.id]: name }));
    setNote({ text: t("dash.doc.renamed", { name }), error: false });
  };

  const shown = docs?.find((d) => d.id === details);

  return (
    <WidgetCard
      title={t("dash.doc.title")}
      handle={handle}
      busy={docs === null}
      badge={docs ? <span className="badge">{t("dash.doc.count", { n: docs.length })}</span> : undefined}
    >
      <ul className={s.docs}>
        {docs === null
          ? [0, 1, 2].map((i) => (
            <li key={i} className={s.doc}>
              <span className="skeleton" style={{ width: 32, height: 32 }} />
              <span className={s.skelLines}>
                <span className="skeleton" style={{ height: 14, width: `${70 - i * 12}%` }} />
                <span className="skeleton" style={{ height: 12, width: 160 }} />
              </span>
            </li>
          ))
          : docs.map((d) => (
            <li
              key={d.id}
              ref={(el) => { if (el) rows.current.set(d.id, el); else rows.current.delete(d.id); }}
              className={`${s.doc} ${menu?.doc.id === d.id ? s.docActive : ""}`}
              tabIndex={0}
              aria-describedby={`${uid}${d.id}`}
              onContextMenu={(e) => onContext(e, d)}
              onKeyDown={(e) => onKey(e, d)}
            >
              <span className={s.docIcon} aria-hidden="true"><Icon name="file" size={18} /></span>
              <span className={s.docText}>
                <span className={s.docName}>{nameOf(d)}</span>
                <span id={`${uid}${d.id}`} className="small muted">{t(`dash.doc.kind.${d.kind}` as DictKey)} · {d.ref} · {formatDate(d.date)}</span>
              </span>
            </li>
          ))}
      </ul>
      {note && <p className={`small ${note.error ? s.docError : "muted"}`} role="status">{note.text}</p>}
      {shown && (
        <div className={s.docDetails} role="region" aria-label={t("dash.doc.detailsTitle")}>
          <div className={s.docDetailsHead}>
            <strong>{nameOf(shown)}</strong>
            <button type="button" className="icon-btn" aria-label={t("common.close")} onClick={() => { setDetails(null); rows.current.get(shown.id)?.focus(); }}>
              <Icon name="close" size={14} />
            </button>
          </div>
          <dl>
            <dt>{t("dash.doc.dKind")}</dt><dd>{t(`dash.doc.kind.${shown.kind}` as DictKey)}</dd>
            <dt>{t("dash.doc.dRef")}</dt><dd>{shown.ref}</dd>
            <dt>{t("dash.doc.dDate")}</dt><dd>{formatDate(shown.date)}</dd>
            <dt>{t("dash.doc.dSize")}</dt><dd>{t("dash.doc.size", { kb: shown.sizeKb })}</dd>
          </dl>
        </div>
      )}
      {menu && (
        <DocMenu
          x={menu.x}
          y={menu.y}
          label={nameOf(menu.doc)}
          onClose={closeMenu}
          items={[
            { label: t("dash.doc.details"), onSelect: () => { setDetails(menu.doc.id); back(menu.doc.id); } },
            { label: t("dash.doc.rename"), onSelect: () => rename(menu.doc) },
          ]}
        />
      )}
    </WidgetCard>
  );
}
