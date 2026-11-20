"use client";
import { Children, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import s from "./Help.module.css";

export interface HelpTab {
  id: string;
  label: string;
}

/**
 * OTH-07: the Help centre's tabs (WAI-ARIA tabs pattern). Every panel is rendered by the server; the
 * ones not selected carry `hidden`, so their content is in the DOM but not visible. The selected tab is
 * marked by `aria-selected="true"` (and a roving `tabindex`); arrow keys, Home and End move the
 * selection straight away. The choice is kept in the address (`?tab=fees`) without a navigation.
 */
export function HelpTabs({ label, tabs, initial, children }: { label: string; tabs: HelpTab[]; initial: string; children: ReactNode }) {
  const [selected, setSelected] = useState(tabs.some((t) => t.id === initial) ? initial : tabs[0]!.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = Children.toArray(children);

  const select = (id: string, focus = false) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id === tabs[0]!.id) url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(window.history.state, "", url);
    if (focus) refs.current[tabs.findIndex((t) => t.id === id)]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = tabs.length;
    const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(tabs[to]!.id, true);
  };

  return (
    <div className={s.tabs}>
      <div role="tablist" aria-label={label} className={s.tablist}>
        {tabs.map((tab, i) => {
          const on = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="tab"
              id={`help-tab-${tab.id}`}
              aria-controls={`help-panel-${tab.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              className={s.tab}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`help-panel-${tab.id}`}
          aria-labelledby={`help-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== selected}
          className={s.panel}
        >
          {panels[i]}
        </div>
      ))}
    </div>
  );
}
