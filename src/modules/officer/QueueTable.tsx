"use client";
import { Fragment, useId } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { categoryById, type QueueItem } from "./queue";
import { ClaimCell, type RowBusy } from "./ClaimCell";
import { QueueDetail, type DetailState } from "./QueueDetail";
import { TimeLeft } from "./TimeLeft";
import { useFlip } from "./useFlip";
import s from "./Officer.module.css";

export interface QueueTableProps {
  rows: QueueItem[];
  now: number;
  username: string;
  fresh: Set<string>;
  selected: Set<string>;
  expanded: Set<string>;
  details: Record<string, DetailState>;
  busy: Record<string, RowBusy>;
  wardName: (id: string) => string;
  nameOf: (who: string) => string;
  onSelect: (ref: string) => void;
  onToggle: (ref: string) => void;
  onRetryDetail: (ref: string) => void;
  onClaim: (ref: string) => void;
  onRelease: (ref: string) => void;
}

/**
 * The open grievances in SLA order.
 * DYN-07: rows are keyed by grievance number and kept in SLA order; when a refresh brings in a new
 * grievance it is inserted at its place and every row below it slides down (useFlip, QUEUE_REORDER), so
 * "the 3rd row" is a different grievance after each arrival. The time left ticks every second.
 * TBL-06: the chevron at the start of a row ("Show details", the same name on every row) toggles
 * `aria-expanded` and inserts a second `<tr>` right below it, one cell spanning all columns, that exists
 * only while open; its content loads once (QUEUE_DETAIL). Several rows can be open; open rows move with
 * their grievance when the order changes.
 */
export function QueueTable(p: QueueTableProps) {
  const { t, lang } = useT();
  const uid = useId();
  const flip = useFlip();
  const cols = {
    select: t("oq.col.select"), details: t("oq.col.details"), ref: t("oq.col.ref"), category: t("oq.col.category"),
    ward: t("oq.col.ward"), received: t("oq.col.received"), left: t("oq.col.left"), claimed: t("oq.col.claimed"),
  };

  return (
    <div className={s.tableWrap}>
      <table className={`data-table ${s.queue}`}>
        <caption className="sr-only">{t("oq.caption")}</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">{cols.select}</span></th>
            <th scope="col"><span className="sr-only">{cols.details}</span></th>
            <th scope="col">{cols.ref}</th>
            <th scope="col">{cols.category}</th>
            <th scope="col">{cols.ward}</th>
            <th scope="col">{cols.received}</th>
            <th scope="col">{cols.left}</th>
            <th scope="col">{cols.claimed}</th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((it) => {
            const key = it.ref.replace(/\D/g, "");
            const refId = `${uid}r${key}`;
            const detailId = `${uid}d${key}`;
            const open = p.expanded.has(it.ref);
            const mine = it.claimedBy === p.username;
            const category = categoryById(it.category);
            return (
              <Fragment key={it.ref}>
                <tr ref={flip(it.ref)} className={`${p.fresh.has(it.ref) ? s.fresh : ""} ${open ? s.rowOpen : ""}`}>
                  <td className={s.selCell}>
                    <input type="checkbox" checked={p.selected.has(it.ref)} aria-label={t("oq.selectRow", { ref: it.ref })} onChange={() => p.onSelect(it.ref)} />
                  </td>
                  <td className={s.toggleCell}>
                    <button
                      type="button"
                      className={s.toggle}
                      aria-label={t(open ? "oq.hideDetails" : "oq.showDetails")}
                      aria-expanded={open}
                      aria-controls={open ? detailId : undefined}
                      aria-describedby={refId}
                      onClick={() => p.onToggle(it.ref)}
                    >
                      <Icon name="chevronRight" size={18} className={open ? s.chevOpen : s.chev} />
                    </button>
                  </td>
                  <th scope="row" id={refId} className={s.refCell} data-label={cols.ref}>{it.ref}</th>
                  <td data-label={cols.category}>{category ? pick(category, lang) : it.category}</td>
                  <td data-label={cols.ward}>{p.wardName(it.ward)}</td>
                  <td data-label={cols.received} className={s.nowrap}><time dateTime={it.received}>{formatDateTime(it.received)}</time></td>
                  <td data-label={cols.left} className={s.nowrap}><TimeLeft due={it.due} now={p.now} /></td>
                  <td data-label={cols.claimed} className={s.claimCell}>
                    <ClaimCell
                      claimedBy={it.claimedBy && !mine ? p.nameOf(it.claimedBy) : null}
                      mine={mine}
                      busy={p.busy[it.ref] ?? null}
                      describedBy={refId}
                      onClaim={() => p.onClaim(it.ref)}
                      onRelease={() => p.onRelease(it.ref)}
                    />
                  </td>
                </tr>
                {open && (
                  <tr id={detailId} ref={flip(`${it.ref}#d`)} className={s.detailRow}>
                    <td colSpan={8}>
                      <QueueDetail state={p.details[it.ref] ?? "loading"} wardName={p.wardName(it.ward)} nameOf={p.nameOf} onRetry={() => p.onRetryDetail(it.ref)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
