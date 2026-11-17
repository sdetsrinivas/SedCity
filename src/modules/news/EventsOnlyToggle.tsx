"use client";
import { useEffect } from "react";
import { useT } from "@/i18n/client";
import { store } from "@/mock/store";
import { useNewsFilter } from "./NewsFilterContext";
import s from "./News.module.css";

export const EVENTS_ONLY_KEY = "newsEventsOnly";

/**
 * CHK-08 (see EventsOnlyIsland). The saved choice lives in localStorage, which the server cannot read,
 * so the server HTML is always unchecked; the saved value is applied in an effect once the island has
 * hydrated, and the list then reloads. A `button role=checkbox` (not a native input) so a click made
 * before hydration is simply lost instead of being replayed by React.
 */
export default function EventsOnlyToggle() {
  const { t } = useT();
  const [filter, filters] = useNewsFilter();

  useEffect(() => {
    if (store.get(EVENTS_ONLY_KEY, false)) filters.set({ eventsOnly: true });
  }, [filters]);

  const toggle = () => {
    const next = !filter.eventsOnly;
    store.set(EVENTS_ONLY_KEY, next);
    filters.set({ eventsOnly: next });
  };

  return (
    <div className={s.toggleRow}>
      <button
        type="button"
        role="checkbox"
        aria-checked={filter.eventsOnly}
        aria-labelledby="news-events-only-label"
        className={s.check}
        onClick={toggle}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <span id="news-events-only-label" className={s.toggleLabel} onClick={toggle}>{t("news.eventsOnly")}</span>
    </div>
  );
}
