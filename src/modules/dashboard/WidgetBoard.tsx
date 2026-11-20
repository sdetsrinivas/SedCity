"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { loadOrder, saveOrder } from "@/mock/endpoints/dashboard";
import { WIDGETS, dropIndex, moveItem, type WidgetId } from "./data";
import s from "./Dashboard.module.css";

/** Props a card spreads on its drag handle (rendered in the card's title bar). */
export interface HandleProps {
  label: string;
  describedBy: string;
  lifted: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

const TITLE_KEY: Record<WidgetId, DictKey> = {
  notifications: "dash.nt.title", applications: "dash.app.title", payments: "dash.pay.title", documents: "dash.doc.title",
};

/** Pointer travel (px) before a press on the handle becomes a drag. */
const DRAG_THRESHOLD = 6;

interface Drag { id: WidgetId; pointerId: number; startY: number; from: number; mids: number[]; height: number; active: boolean }

/**
 * OTH-04: the cards can be put in any order by dragging the grip in their title bar. This is built on
 * pointer events (pointerdown → pointermove → pointerup with pointer capture), not the HTML5 drag-and-drop
 * API: nothing is `draggable`, there are no dragstart/drop events, and the press must travel 6px before the
 * card lifts. While dragging, the card follows the pointer and the others slide to make room; on release
 * the new order is saved for this citizen. Keyboard: Space or Enter on the grip lifts the card, the arrow
 * keys move it, Space or Enter drops it and Escape puts it back.
 */
export function WidgetBoard({ username, render }: { username: string; render: (id: WidgetId, handle: HandleProps) => ReactNode }) {
  const { t } = useT();
  const uid = useId();
  const [order, setOrder] = useState<WidgetId[]>(WIDGETS);
  const [view, setView] = useState<{ id: WidgetId; dy: number; to: number; height: number } | null>(null);
  const [lifted, setLifted] = useState<{ id: WidgetId; before: WidgetId[] } | null>(null);
  const [announce, setAnnounce] = useState("");
  const slots = useRef(new Map<WidgetId, HTMLDivElement>());
  const drag = useRef<Drag | null>(null);

  useEffect(() => setOrder(loadOrder(username)), [username]);

  const name = (id: WidgetId) => t(TITLE_KEY[id]);
  const commit = (next: WidgetId[]) => { setOrder(next); saveOrder(username, next); };
  const position = (list: WidgetId[], id: WidgetId) => ({ pos: list.indexOf(id) + 1, total: list.length });

  const pageY = (e: { clientY: number }) => e.clientY + window.scrollY;

  const handleFor = (id: WidgetId): HandleProps => ({
    label: t("dash.move.label", { name: name(id) }),
    describedBy: `${uid}help`,
    lifted: lifted?.id === id,
    onPointerDown: (e) => {
      if (e.button !== 0 || lifted) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const others = order.filter((w) => w !== id).map((w) => slots.current.get(w)!.getBoundingClientRect());
      const own = slots.current.get(id)!.getBoundingClientRect();
      drag.current = {
        id, pointerId: e.pointerId, startY: pageY(e), from: order.indexOf(id), active: false,
        mids: others.map((r) => r.top + window.scrollY + r.height / 2), height: own.height,
      };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dy = pageY(e) - d.startY;
      if (!d.active && Math.abs(dy) < DRAG_THRESHOLD) return;
      d.active = true;
      e.preventDefault();
      setView({ id: d.id, dy, to: dropIndex(d.mids, pageY(e), dy > 0), height: d.height });
    },
    onPointerUp: (e) => {
      const d = drag.current;
      drag.current = null;
      setView(null);
      if (!d || !d.active) return;
      const to = dropIndex(d.mids, pageY(e), pageY(e) - d.startY > 0);
      if (to === d.from) return;
      const next = moveItem(order, d.from, to);
      commit(next);
      setAnnounce(t("dash.move.dropped", { name: name(d.id), ...position(next, d.id) }));
    },
    onPointerCancel: () => { drag.current = null; setView(null); },
    onKeyDown: (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!lifted) {
          setLifted({ id, before: order });
          setAnnounce(t("dash.move.lifted", { name: name(id), ...position(order, id) }));
        } else {
          commit(order);
          setLifted(null);
          setAnnounce(t("dash.move.dropped", { name: name(id), ...position(order, id) }));
        }
      } else if (lifted?.id === id && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const from = order.indexOf(id);
        const to = e.key === "ArrowUp" ? Math.max(0, from - 1) : Math.min(order.length - 1, from + 1);
        if (to === from) return;
        const next = moveItem(order, from, to);
        const grip = e.currentTarget;
        setOrder(next);
        setAnnounce(t("dash.move.moved", { name: name(id), ...position(next, id) }));
        // The focused grip keeps its element (keyed list), so focus stays on it; keep it in view.
        requestAnimationFrame(() => { grip.scrollIntoView({ block: "nearest" }); });
      } else if (lifted?.id === id && e.key === "Escape") {
        e.preventDefault();
        setOrder(lifted.before);
        setLifted(null);
        setAnnounce(t("dash.move.cancelled", { name: name(id) }));
      }
    },
  });

  /** While dragging: the dragged card follows the pointer; the cards it passed slide one place towards its start. */
  const shift = (id: WidgetId, i: number): number => {
    if (!view) return 0;
    if (id === view.id) return view.dy;
    const from = order.indexOf(view.id);
    const gap = view.height + 20;
    if (from < view.to && i > from && i <= view.to) return -gap;
    if (from > view.to && i >= view.to && i < from) return gap;
    return 0;
  };

  const reset = () => {
    commit(WIDGETS);
    setAnnounce(t("dash.move.reset"));
  };

  return (
    <div className={s.board}>
      <p id={`${uid}help`} className="sr-only">{t("dash.move.help")}</p>
      {order.map((id, i) => (
        <div
          key={id}
          ref={(el) => { if (el) slots.current.set(id, el); else slots.current.delete(id); }}
          className={`${s.slot} ${view?.id === id ? s.dragging : ""} ${view && view.id !== id ? s.sliding : ""} ${lifted?.id === id ? s.lifted : ""}`}
          style={view ? { transform: `translateY(${shift(id, i)}px)` } : undefined}
        >
          {render(id, handleFor(id))}
        </div>
      ))}
      <div className={s.boardFoot}>
        <button type="button" className="link-btn small" onClick={reset}>{t("dash.move.resetBtn")}</button>
      </div>
      <p className="sr-only" aria-live="assertive">{announce}</p>
    </div>
  );
}

/** The grip in a card's title bar (six dots). Only the aria-label names it. */
export function DragHandle({ label, describedBy, lifted, ...events }: HandleProps) {
  return (
    <button type="button" className={s.handle} aria-label={label} aria-describedby={describedBy} aria-pressed={lifted} {...events}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {[3, 8, 13].flatMap((y) => [5.5, 10.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />))}
      </svg>
    </button>
  );
}
