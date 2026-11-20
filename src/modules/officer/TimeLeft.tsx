"use client";
import { useT } from "@/i18n/client";
import { dueSoon, splitLeft } from "./queue";
import s from "./Officer.module.css";

/** Time left until the service time runs out, ticking every second ("1d 04:12:09", "Overdue by 06:00:12"). */
export function TimeLeft({ due, now }: { due: string; now: number }) {
  const { t } = useT();
  const dueMs = Date.parse(due);
  const { overdue, days, time } = splitLeft(dueMs, now);
  const span = days > 0 ? t("oq.leftDays", { d: days, time }) : time;
  return (
    <time dateTime={due} className={overdue ? s.overdue : dueSoon(dueMs, now) ? s.soon : s.left}>
      {overdue ? t("oq.overdue", { time: span }) : span}
    </time>
  );
}
