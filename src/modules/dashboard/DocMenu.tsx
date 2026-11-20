"use client";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import s from "./Dashboard.module.css";

export interface MenuItem { label: string; onSelect: () => void }

/**
 * BTN-08: the custom context menu of a document, opened by right-click (or the context-menu key /
 * Shift+F10) at the pointer. Portalled to <body> with `position: fixed`, kept inside the window. Focus
 * goes to the first item; arrows move, Enter chooses, Escape / Tab / a click elsewhere / scrolling close it.
 */
export function DocMenu({ x, y, label, items, onClose }: { x: number; y: number; label: string; items: MenuItem[]; onClose: (refocus: boolean) => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const r = menu.current!.getBoundingClientRect();
    setPos({ left: Math.max(4, Math.min(x, window.innerWidth - r.width - 4)), top: Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) });
    menu.current!.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [x, y]);

  useEffect(() => {
    const away = (e: Event) => { if (!menu.current?.contains(e.target as Node)) onClose(false); };
    const scroll = () => onClose(false);
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [onClose]);

  const onKey = (e: KeyboardEvent) => {
    const list = [...menu.current!.querySelectorAll<HTMLElement>("[role=menuitem]")];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      onClose(true);
    }
  };

  return createPortal(
    <div ref={menu} role="menu" aria-label={label} className={s.menu} style={pos} onKeyDown={onKey} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it) => (
        <button key={it.label} type="button" role="menuitem" tabIndex={-1} className={s.menuItem} onClick={it.onSelect}>
          {it.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
