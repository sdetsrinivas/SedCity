"use client";
import { useId, type ReactNode } from "react";
import { DragHandle, type HandleProps } from "./WidgetBoard";
import s from "./Dashboard.module.css";

/** The frame of a dashboard card: grip, heading, optional badge, and a body that is busy while loading. */
export function WidgetCard({ title, handle, badge, busy, children }: {
  title: string;
  handle: HandleProps;
  badge?: ReactNode;
  busy: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={`card ${s.widget}`} aria-labelledby={id}>
      <div className="card-title">
        <div className={s.titleRow}>
          <DragHandle {...handle} />
          <h2 id={id}>{title}</h2>
        </div>
        {badge}
      </div>
      <div className={`card-body ${s.widgetBody}`} aria-busy={busy}>
        {children}
      </div>
    </section>
  );
}
