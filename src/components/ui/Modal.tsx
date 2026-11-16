"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./Modal.module.css";

/** Framework modal rendered through a portal at the end of <body>. */
export function Modal({
  open, title, children, footer, onClose, labelledBy, dismissible = true,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  labelledBy?: string;
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = labelledBy ?? `modal-title-${title.length}`;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose?.();
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
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose?.()}>
      <div ref={panel} className={s.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={s.title}>{title}</h2>
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
