"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import s from "./Dashboard.module.css";

/**
 * DLG-11: a snackbar at the bottom of the window with one action. It is portalled to <body> (outside the
 * card, which may be moved or transformed) and shown only while its owner keeps it; the owner runs the timer.
 */
export function Snackbar({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className={s.snackbar} role="status">
      <span>{message}</span>
      <button type="button" className={s.snackAction} onClick={onAction}>{action}</button>
    </div>,
    document.body,
  );
}
