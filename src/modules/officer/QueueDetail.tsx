"use client";
import { useT } from "@/i18n/client";
import { pick, type DictKey } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { streetName, type HistoryEntry, type QueueItem } from "./queue";
import s from "./Officer.module.css";

export type DetailState = "loading" | "error" | { item: QueueItem; history: HistoryEntry[] };

/** Contents of a row's details (TBL-06): the complaint, citizen, location, due time and history. */
export function QueueDetail({ state, wardName, nameOf, onRetry }: {
  state: DetailState;
  wardName: string;
  nameOf: (who: string) => string;
  onRetry: () => void;
}) {
  const { t, lang } = useT();
  if (state === "loading") return <p className="muted" role="status">{t("oq.d.loading")}</p>;
  if (state === "error") {
    return (
      <div className="alert alert-error" role="alert">
        {t("oq.d.error")} <button type="button" className="link-btn" onClick={onRetry}>{t("oq.retry")}</button>
      </div>
    );
  }
  const { item, history } = state;
  return (
    <div className={s.detail}>
      <dl className={s.facts}>
        <div className={s.factWide}><dt>{t("oq.d.complaint")}</dt><dd>{item.description}</dd></div>
        <div><dt>{t("oq.d.citizen")}</dt><dd>{pick(item.citizen, lang)}</dd></div>
        <div><dt>{t("oq.d.mobile")}</dt><dd>{item.mobile}</dd></div>
        <div><dt>{t("oq.d.location")}</dt><dd>{`${streetName(item.street)}, ${wardName}`}</dd></div>
        <div><dt>{t("oq.d.due")}</dt><dd><time dateTime={item.due}>{formatDateTime(item.due)}</time></dd></div>
      </dl>
      <h3 className={s.historyTitle}>{t("oq.d.history")}</h3>
      <ol className={s.history}>
        {history.map((h, i) => (
          <li key={i}>
            <time dateTime={h.at}>{formatDateTime(h.at)}</time>
            <span>{t(`oq.h.${h.kind}` as DictKey, { name: h.by ? nameOf(h.by) : "" })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
