"use client";
import { useT } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import type { WaterBill } from "@/mock/endpoints/water";
import { splitAmount } from "./bill";
import s from "./Water.module.css";

/**
 * OTH-12: the amount is split across three spans with a non-breaking space after the ₹ sign,
 * so "₹1,234.50" never exists as one text node and textContent holds "₹ 1,234.50".
 */
export function AmountDue({ bill }: { bill: WaterBill }) {
  const { t } = useT();
  const amount = splitAmount(bill.paid ? 0 : bill.charges.total);
  return (
    <aside className={s.due} aria-labelledby="wt-due-label">
      <p id="wt-due-label" className={s.dueLabel}>{t("wt.amountDue")}</p>
      <p id="amount-due" className={s.dueAmount}>
        <span className={s.dueSymbol}>{amount.symbol}</span>{" "}<span>{amount.whole}</span><span className={s.duePaise}>.{amount.fraction}</span>
      </p>
      <p className={s.dueNote}>
        {bill.paid ? t("wt.paidNote") : t("wt.payBy", { date: formatDate(bill.dueDate) })}
      </p>
    </aside>
  );
}
