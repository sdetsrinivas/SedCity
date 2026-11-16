"use client";
import { useEffect, useState } from "react";
import { getSession, SESSION_EVENT, type Session } from "./session";

/** Session is client-only state, so the server render always reflects "signed out". */
export function useSession(): { session: Session | null; ready: boolean } {
  const [state, setState] = useState<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
  useEffect(() => {
    const sync = () => setState({ session: getSession(), ready: true });
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
