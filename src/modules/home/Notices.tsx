import Link from "next/link";
import { getT } from "@/i18n/server";
import { pick, type DictKey } from "@/i18n";
import { serverWait } from "@/mock/server-delay";
import notices from "@/mock/data/notices.json";
import s from "./Home.module.css";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

/** Server component streamed in after STREAM_ANNOUNCEMENTS (2s) via <Suspense>. */
export async function Notices() {
  await serverWait("STREAM_ANNOUNCEMENTS");
  const { t, lang } = await getT();
  return (
    <ul className={s.notices}>
      {notices.map((n) => (
        <li key={n.id}>
          <span className={`badge ${s[`cat_${n.category}`]}`}>{t(`notice.${n.category}` as DictKey)}</span>
          <Link href="/news">{pick(n, lang)}</Link>
          <time dateTime={n.date} className="small muted">{fmt(n.date)}</time>
        </li>
      ))}
    </ul>
  );
}

export function NoticesSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className={s.noticeSkeleton}>
      {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 18, marginBottom: 14, width: `${90 - i * 9}%` }} />)}
    </div>
  );
}
