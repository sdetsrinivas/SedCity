"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { formatINR, todayISO } from "@/lib/format";
import { inRange, monthRange, monthlyTotals, presetRange, round2, serviceTotals, type Payment, type Range } from "./data";
import type { HandleProps } from "./WidgetBoard";
import { WidgetCard } from "./WidgetCard";
import { RangePicker } from "./RangePicker";
import { MonthlyChart } from "./MonthlyChart";
import { ServiceChart } from "./ServiceChart";
import { PaymentGrid } from "./PaymentGrid";
import s from "./Dashboard.module.css";

/**
 * Payment history: a period (DAT-03), the monthly totals on a canvas (OTH-15; clicking a month's bar
 * narrows the period to that month), the totals by service in SVG (OTH-16) and the payments in a
 * `div role=grid` (TBL-03). The default period is the last 12 months.
 */
export function Payments({ payments, handle }: { payments: Payment[] | null; handle: HandleProps }) {
  const { t } = useT();
  const [today] = useState(todayISO);
  const [range, setRange] = useState<Range>(() => presetRange(today, 12));
  const shown = (payments ?? []).filter((p) => inRange(p.date, range));
  const total = round2(shown.reduce((sum, p) => sum + p.amount, 0));

  return (
    <WidgetCard
      title={t("dash.pay.title")}
      handle={handle}
      busy={payments === null}
      badge={payments ? <span className="badge">{t("dash.pay.total", { amount: formatINR(total) })}</span> : undefined}
    >
      <RangePicker value={range} today={today} onChange={setRange} />
      <div className={s.charts}>
        <figure className={s.chartBox}>
          <figcaption>{t("dash.pay.byMonth")}</figcaption>
          {payments === null
            ? <div className="skeleton" style={{ height: 220 }} />
            : <MonthlyChart totals={monthlyTotals(shown, range)} onPick={(month) => setRange(monthRange(month, today))} />}
        </figure>
        <figure className={s.chartBox}>
          <figcaption>{t("dash.pay.byService")}</figcaption>
          {payments === null ? <div className="skeleton" style={{ height: 160 }} /> : <ServiceChart totals={serviceTotals(shown)} />}
        </figure>
      </div>
      <PaymentGrid payments={payments === null ? null : shown} total={total} />
    </WidgetCard>
  );
}
