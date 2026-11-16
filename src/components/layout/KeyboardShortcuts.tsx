"use client";
import { useEffect } from "react";
import { useT } from "@/i18n/client";

/**
 * OTH-11: global keyboard shortcuts.
 *  "/"      → focus the home-page service search (ignored while typing in a field)
 *  Alt+L    → toggle English / Tamil (matched on KeyboardEvent.code, so macOS Option works)
 */
export function KeyboardShortcuts() {
  const { lang, setLang } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const search = document.querySelector<HTMLInputElement>("input[type='search'][name='q']");
        if (search) { e.preventDefault(); search.focus(); }
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyL") {
        e.preventDefault();
        setLang(lang === "en" ? "ta" : "en");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lang, setLang]);
  return null;
}
