"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { venueById } from "@/modules/bookings/booking";
import type { Payment } from "./data";
import s from "./Dashboard.module.css";

type SortKey = "date" | "amount";
type Sort = { key: SortKey; dir: "ascending" | "descending" };

const COLS = 5;

/**
 * TBL-03: the payments as a `div role=grid` laid out with CSS grid: no <table>, <tr> or <td>. Rows are
 * `div role=row` with `aria-rowindex`, cells `div role=gridcell` / `role=columnheader` with `aria-colindex`.
 * The last row is a total, not a payment (its label cell spans four columns: `aria-colspan=4`). Date and Amount sort (aria-sort on the column header). One cell
 * is in the tab order; the arrow keys, Home / End and Ctrl+Home / Ctrl+End move between cells. At narrow
 * widths each row becomes a two-column block and the header row is visually hidden (still in the tree).
 * While the data loads the grid holds three placeholder rows (DYN-03).
 */
export function PaymentGrid({ payments, total }: { payments: Payment[] | null; total: number }) {
  const { t, lang } = useT();
  const uid = useId();
  const grid = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "descending" });
  const [tabStop, setActive] = useState<[number, number]>([1, 1]);

  const rows = [...(payments ?? [])].sort((a, b) => {
    const d = sort.key === "date" ? a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref) : a.amount - b.amount || a.date.localeCompare(b.date);
    return sort.dir === "ascending" ? d : -d;
  });
  const lastRow = payments === null ? 4 : rows.length + 2; // header + rows + total (or the empty row)
  // The period may shrink the grid under the tab stop: keep it on an existing cell.
  const active: [number, number] = tabStop[0] > lastRow || (rows.length === 0 && tabStop[0] === 2) ? [Math.min(tabStop[0], lastRow), 1] : tabStop;

  const head = [t("dash.pay.col.date"), t("dash.pay.col.receipt"), t("dash.pay.col.service"), t("dash.pay.col.method"), t("dash.pay.col.amount")];
  const detail = (p: Payment) => (p.service === "booking" ? pick(venueById(p.detail) ?? { en: p.detail, ta: p.detail }, lang) : p.detail);

  const toggle = (key: SortKey) => setSort((cur) => ({ key, dir: cur.key === key && cur.dir === "descending" ? "ascending" : "descending" }));

  /** Focuses the cell at (r, c); in a row with a spanning cell, the one covering column c (rightwards: the next one). */
  const focusCell = (r: number, c: number, right = false) => {
    const row = Math.min(Math.max(r, 1), lastRow);
    const col = Math.min(Math.max(c, 1), COLS);
    const cells = [...(grid.current?.querySelectorAll<HTMLElement>(`[aria-rowindex="${row}"] [aria-colindex]`) ?? [])];
    const at = (x: HTMLElement) => Number(x.getAttribute("aria-colindex"));
    const el = cells.find((x) => at(x) === col)
      ?? (right ? cells.find((x) => at(x) > col) : undefined)
      ?? cells.filter((x) => at(x) <= col).at(-1);
    if (!el) return;
    setActive([row, Number(el.getAttribute("aria-colindex"))]);
    (el.querySelector<HTMLElement>("button") ?? el).focus();
  };

  const onKey = (e: KeyboardEvent) => {
    const [r, c] = active;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [r - 1, c], ArrowDown: [r + 1, c], ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1],
      Home: e.ctrlKey ? [1, 1] : [r, 1], End: e.ctrlKey ? [lastRow, COLS] : [r, COLS],
    };
    const to = moves[e.key];
    if (!to) return;
    e.preventDefault();
    focusCell(to[0], to[1], e.key === "ArrowRight");
  };

  /** Props of the cell at (r, c): its column index and whether it holds the grid's tab stop. */
  const cell = (r: number, c: number) => ({
    "aria-colindex": c,
    tabIndex: active[0] === r && active[1] === c ? 0 : -1,
    onFocus: () => setActive([r, c]),
  });

  return (
    <div className={s.gridWrap}>
      <span id={`${uid}c`} className="sr-only">{t("dash.pay.gridLabel")}</span>
      <div ref={grid} role="grid" aria-labelledby={`${uid}c`} aria-rowcount={lastRow} aria-colcount={COLS} aria-busy={payments === null} className={s.grid} onKeyDown={onKey}>
        <div role="row" aria-rowindex={1} className={`${s.gRow} ${s.gHead}`}>
          {head.map((h, i) => {
            const key: SortKey | null = i === 0 ? "date" : i === 4 ? "amount" : null;
            const c = i + 1;
            return (
              <div key={h} role="columnheader" aria-sort={key && sort.key === key ? sort.dir : undefined} className={i === 4 ? s.gNum : undefined}
                {...(key ? { "aria-colindex": c } : cell(1, c))}>
                {key ? (
                  <button type="button" className={s.gSort} tabIndex={active[0] === 1 && active[1] === c ? 0 : -1} onFocus={() => setActive([1, c])} onClick={() => toggle(key)}>
                    {h}<span aria-hidden="true">{sort.key === key ? (sort.dir === "ascending" ? " ▲" : " ▼") : ""}</span>
                  </button>
                ) : h}
              </div>
            );
          })}
        </div>
        {payments === null && [2, 3, 4].map((r) => (
          <div key={r} role="row" aria-rowindex={r} className={s.gRow}>
            {[1, 2, 3, 4, 5].map((c) => <div key={c} role="gridcell" {...cell(r, c)}><span className="skeleton" style={{ display: "block", height: 14, width: "75%" }} /></div>)}
          </div>
        ))}
        {payments !== null && rows.length === 0 && (
          <div role="row" aria-rowindex={2} className={s.gRow}>
            <div role="gridcell" {...cell(2, 1)} className={s.gEmpty}>{t("dash.pay.none")}</div>
          </div>
        )}
        {rows.map((p, i) => {
          const r = i + 2;
          return (
            <div key={p.ref} role="row" aria-rowindex={r} className={s.gRow}>
              <div role="gridcell" {...cell(r, 1)} data-label={head[0]}>{formatDate(p.date)}</div>
              <div role="gridcell" {...cell(r, 2)} data-label={head[1]} className={s.gRef}>{p.ref}</div>
              <div role="gridcell" {...cell(r, 3)} data-label={head[2]}>
                {t(`dash.svc.${p.service}` as DictKey)}
                <span className="small muted"> · {detail(p)}</span>
              </div>
              <div role="gridcell" {...cell(r, 4)} data-label={head[3]}>{t(`dash.method.${p.method}` as DictKey)}</div>
              <div role="gridcell" {...cell(r, 5)} data-label={head[4]} className={s.gNum}>{formatINR(p.amount)}</div>
            </div>
          );
        })}
        {payments !== null && rows.length > 0 && (
          <div role="row" aria-rowindex={lastRow} className={`${s.gRow} ${s.gTotal}`}>
            <div role="gridcell" aria-colspan={4} {...cell(lastRow, 1)} className={s.gTotalLabel}>{t("dash.pay.totalRow", { n: rows.length })}</div>
            <div role="gridcell" {...cell(lastRow, 5)} data-label={head[4]} className={s.gNum}>{formatINR(total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
