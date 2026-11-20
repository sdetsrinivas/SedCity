"use client";
import { useState } from "react";
import s from "./Help.module.css";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

/**
 * OTH-08: frequently asked questions as an accordion. Each question is a `<button aria-expanded>` in a
 * heading; its answer is a region that carries `hidden` while closed (present in the DOM, not visible).
 * Only one answer is open at a time across all groups: opening a question closes the one that was open.
 */
export function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={s.faq}>
      {groups.map((g) => (
        <div key={g.id} className={s.faqGroup}>
          <h2 id={`faq-g-${g.id}`} className={s.faqGroupTitle}>{g.title}</h2>
          {g.items.map((item) => {
            const expanded = open === item.id;
            return (
              <div key={item.id} className={s.faqItem}>
                <h3 className={s.faqQ}>
                  <button
                    type="button"
                    id={`faq-q-${item.id}`}
                    aria-expanded={expanded}
                    aria-controls={`faq-a-${item.id}`}
                    className={s.faqButton}
                    onClick={() => setOpen(expanded ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <svg className={s.chevron} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </h3>
                <div id={`faq-a-${item.id}`} role="region" aria-labelledby={`faq-q-${item.id}`} hidden={!expanded} className={s.faqA}>
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
