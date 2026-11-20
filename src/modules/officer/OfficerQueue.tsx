"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { delayFor } from "@/mock/api";
import { fetchDetail, fetchQueue, claimGrievance, releaseGrievance, loadWards, saveWards } from "@/mock/endpoints/officer";
import type { Session } from "@/lib/session";
import { RequireRole } from "@/modules/auth/RequireRole";
import { COLLEAGUES, wardsOfZone, zoneById, zoneOf, type QueueItem } from "./queue";
import { WardPicker, type WardOption } from "./WardPicker";
import { QueueTable } from "./QueueTable";
import { BulkBar } from "./BulkBar";
import type { RowBusy } from "./ClaimCell";
import type { DetailState } from "./QueueDetail";
import s from "./Officer.module.css";

export function OfficerQueue() {
  return <RequireRole role="officer">{(session) => <QueueBoard session={session} />}</RequireRole>;
}

const toggleIn = (set: Set<string>, key: string) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
};

function QueueBoard({ session }: { session: Session }) {
  const { t, lang } = useT();
  const username = session.username;
  const zone = zoneOf(username);
  const zoneWards = useMemo(() => wardsOfZone(zone), [zone]);

  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [wards, setWards] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [busy, setBusy] = useState<Record<string, RowBusy>>({});
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef<Set<string> | null>(null);

  useEffect(() => setWards(loadWards(username)), [username]);

  // The countdowns tick every second.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // First load, then an automatic refresh every QUEUE_POLL; arrivals are marked fresh.
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const receive = (list: QueueItem[]) => {
      if (!alive) return;
      const seen = known.current;
      if (seen) {
        const added = list.filter((it) => !seen.has(it.ref)).map((it) => it.ref);
        if (added.length) setFresh((cur) => new Set([...cur, ...added]));
      }
      known.current = new Set(list.map((it) => it.ref));
      setItems(list);
      setFailed(false);
      setUpdatedAt(Date.now());
    };
    const schedule = () => { timer = window.setTimeout(poll, Math.max(200, delayFor("QUEUE_POLL"))); };
    const poll = () => {
      fetchQueue(username, true).then(receive, () => {}).finally(() => { if (alive) schedule(); });
    };
    fetchQueue(username).then(
      (list) => { receive(list); if (alive) schedule(); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; window.clearTimeout(timer); };
  }, [username, attempt]);

  const wardName = useCallback((id: string) => {
    const w = zoneWards.find((x) => x.id === id);
    return w ? pick(w, lang) : id;
  }, [zoneWards, lang]);
  const nameOf = useCallback((who: string) => {
    if (who === username) return lang === "ta" ? session.nameTa : session.name;
    const c = COLLEAGUES.find((x) => x.id === who);
    return c ? pick(c, lang) : who;
  }, [username, lang, session.name, session.nameTa]);

  const all = useMemo(() => items ?? [], [items]);
  const rows = wards.length ? all.filter((it) => wards.includes(it.ward)) : all;
  const options: WardOption[] = zoneWards.map((w) => ({ ...w, open: all.filter((it) => it.ward === w.id).length }));
  const chosen = rows.filter((it) => selected.has(it.ref)).map((it) => it.ref);

  const changeWards = (next: string[]) => {
    setWards(next);
    saveWards(username, next);
  };

  const replace = useCallback((item: QueueItem) => {
    setItems((cur) => cur && cur.map((it) => (it.ref === item.ref ? item : it)));
  }, []);
  const markBusy = useCallback((ref: string, b: RowBusy) => setBusy((cur) => ({ ...cur, [ref]: b })), []);

  const loadDetail = useCallback((ref: string) => {
    setDetails((cur) => ({ ...cur, [ref]: "loading" }));
    fetchDetail(username, ref).then(
      (d) => setDetails((cur) => ({ ...cur, [ref]: d ?? "error" })),
      () => setDetails((cur) => ({ ...cur, [ref]: "error" })),
    );
  }, [username]);

  /** After a claim or release the history changed: reload open details, forget closed ones. */
  const historyChanged = useCallback((ref: string) => {
    if (expanded.has(ref)) loadDetail(ref);
    else setDetails((cur) => { const next = { ...cur }; delete next[ref]; return next; });
  }, [expanded, loadDetail]);

  const toggleRow = (ref: string) => {
    const opening = !expanded.has(ref);
    setExpanded((cur) => toggleIn(cur, ref));
    if (opening && (!details[ref] || details[ref] === "error")) loadDetail(ref);
  };

  const single = async (ref: string, action: "claim" | "release") => {
    markBusy(ref, action === "claim" ? "claiming" : "releasing");
    try {
      const r = await (action === "claim" ? claimGrievance : releaseGrievance)(username, ref);
      if (r) { replace(r.item); historyChanged(ref); }
    } catch {
      // The row stays as it was; the officer can try again.
    } finally {
      markBusy(ref, null);
    }
  };

  const zoneName = zoneById(zone)?.[lang] ?? "";
  return (
    <section className="card" aria-labelledby="oq-title">
      <div className="card-title">
        <h2 id="oq-title">{t("oq.title")}</h2>
        {updatedAt !== null && <span className="small muted">{t("oq.updated", { time: new Date(updatedAt).toTimeString().slice(0, 5) })}</span>}
      </div>
      <div className="card-body">
        <p className={`muted ${s.who}`}>{`${lang === "ta" ? session.nameTa : session.name} · ${zoneName}`}</p>
        <div className={s.toolbar}>
          <WardPicker options={options} value={wards} onChange={changeWards} allLabel={t("oq.allWards", { zone: zoneName })} />
          <BulkBar
            username={username}
            refs={chosen}
            nameOf={nameOf}
            onBusy={markBusy}
            onResult={(item) => { replace(item); historyChanged(item.ref); }}
            onDone={() => setSelected(new Set())}
          />
        </div>
        <p className="small muted">{t("oq.help")}</p>
        {items === null && !failed && <p className={s.loading} role="status">{t("oq.loading")}</p>}
        {failed && (
          <div className="alert alert-error" role="alert">
            {t("oq.error")} <button type="button" className="link-btn" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>{t("oq.retry")}</button>
          </div>
        )}
        {items !== null && (
          <>
            <p className={s.count} aria-live="polite">{t("oq.showing", { shown: rows.length, total: all.length })}</p>
            {rows.length === 0 ? (
              <p className="muted">{t("oq.empty")}</p>
            ) : (
              <QueueTable
                rows={rows}
                now={now}
                username={username}
                fresh={fresh}
                selected={selected}
                expanded={expanded}
                details={details}
                busy={busy}
                wardName={wardName}
                nameOf={nameOf}
                onSelect={(ref) => setSelected((cur) => toggleIn(cur, ref))}
                onToggle={toggleRow}
                onRetryDetail={loadDetail}
                onClaim={(ref) => single(ref, "claim")}
                onRelease={(ref) => single(ref, "release")}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
