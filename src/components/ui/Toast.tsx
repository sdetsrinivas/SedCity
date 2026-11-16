"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { delayFor } from "@/mock/api";
import { useT } from "@/i18n/client";
import { Icon } from "./Icon";
import s from "./Toast.module.css";

export type ToastTone = "info" | "success" | "error";
export interface ToastInput {
  message: string;
  title?: string;
  tone?: ToastTone;
  /** ms; defaults to the TOAST_TTL delay. 0 = sticky. */
  ttl?: number;
}
interface ToastItem extends Required<Omit<ToastInput, "title">> {
  id: number;
  title?: string;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const seq = useRef(0);
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      const ttl = t.ttl ?? delayFor("TOAST_TTL");
      setItems((xs) => [...xs, { id, tone: "info", ...t, ttl }]);
      // DLG-09: toast removes itself from the DOM after TOAST_TTL (~3s).
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      {mounted && createPortal(<ToastRegion items={items} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

function ToastRegion({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  const { t } = useT();
  return (
    <div className={s.region} aria-live="polite" aria-atomic="false">
      {items.map((it) => (
        <div key={it.id} className={`${s.toast} ${s[it.tone]}`} role={it.tone === "error" ? "alert" : "status"}>
          <div className={s.text}>
            {it.title && <strong>{it.title}</strong>}
            <span>{it.message}</span>
          </div>
          <button type="button" className={s.close} aria-label={t("common.dismiss")} onClick={() => onDismiss(it.id)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
