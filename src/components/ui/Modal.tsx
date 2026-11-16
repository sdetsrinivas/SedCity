"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./Modal.module.css";

/** Open modals, bottom → top. Only the top-most one handles Escape / Tab. */
const stack: string[] = [];

/** Framework modal rendered through a portal at the end of <body>. Supports stacking (nested modals). */
export function Modal({
  open, title, children, footer, onClose, dismissible = true, size = "md",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
  size?: "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const [depth, setDepth] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    stack.push(id);
    setDepth(stack.length);
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape" && dismissible) { e.stopPropagation(); onCloseRef.current?.(); }
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      if (!stack.length) document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, dismissible, id]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={s.backdrop} style={{ zIndex: 900 + depth * 10 }} onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose?.()}>
      <div ref={panel} className={`${s.panel} ${size === "lg" ? s.lg : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={s.title}>{title}</h2>
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
