"use client";
import { useEffect } from "react";

/**
 * DLG-04: while `active` (the form has unsaved changes), leaving the document (reload, closing the
 * tab, typing a new address, a full-page navigation) raises the browser's own "Leave site?" prompt
 * via `beforeunload`. Links inside the portal navigate client-side and do not unload the document,
 * so they do not ask. Shared by the certificate services.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older Chromium and Safari need returnValue set as well.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
