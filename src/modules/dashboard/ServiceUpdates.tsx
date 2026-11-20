import { getT } from "@/i18n/server";
import { pick, type DictKey } from "@/i18n";
import { addDays, formatDate, todayISO } from "@/lib/format";
import { serverWait } from "@/mock/server-delay";
import data from "@/mock/data/dashboard.json";
import s from "./Dashboard.module.css";

/**
 * DYN-03 (server half): planned service updates, streamed in by the server after STREAM_DASHBOARD (3s).
 * The first HTML carries the skeleton below inside the Suspense boundary; Next.js swaps the list in
 * when the stream completes, so the card's content element is replaced, not filled in.
 */
export async function ServiceUpdates() {
  await serverWait("STREAM_DASHBOARD");
  const { t, lang } = await getT();
  const today = todayISO();
  return (
    <ul className={s.updates}>
      {data.updates.map((u) => {
        const date = addDays(today, u.inDays);
        return (
          <li key={u.id}>
            <span className={`badge ${s[`up_${u.kind}`] ?? ""}`}>{t(`dash.up.${u.kind}` as DictKey)}</span>
            <time dateTime={date} className="small muted">{formatDate(date)}</time>
            <p>{pick(u, lang)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function ServiceUpdatesSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={s.skelBlock}>
          <div className="skeleton" style={{ height: 14, width: 120 }} />
          <div className="skeleton" style={{ height: 14, width: `${92 - i * 8}%` }} />
        </div>
      ))}
    </div>
  );
}
