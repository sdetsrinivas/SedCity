"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { useToast } from "@/components/ui/Toast";
import { claimGrievance, releaseGrievance, type ClaimOutcome } from "@/mock/endpoints/officer";
import type { QueueItem } from "./queue";
import type { RowBusy } from "./ClaimCell";
import s from "./Officer.module.css";

type Action = "claim" | "release";

/**
 * DLG-10: toast stack. Claim selected / Release selected work through the ticked grievances one at a
 * time (QUEUE_CLAIM each) and push one toast per grievance as it finishes, then a summary toast. All go
 * to the shared toast region at the end of `<body>`, newest at the bottom. Successful ones close by
 * themselves after TOAST_TTL (3s), each on its own timer, so the stack shrinks from the top while new
 * ones are still coming; failures ("already claimed by …", "not claimed by you") are `role=alert` and
 * stay until dismissed.
 */
export function BulkBar({ username, refs, nameOf, onBusy, onResult, onDone }: {
  username: string;
  refs: string[];
  nameOf: (who: string) => string;
  onBusy: (ref: string, busy: RowBusy) => void;
  onResult: (item: QueueItem) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [running, setRunning] = useState<{ action: Action; done: number; n: number } | null>(null);

  const say = (r: ClaimOutcome | null, ref: string) => {
    if (!r) return toast({ tone: "error", ttl: 0, message: t("oq.t.failed", { ref }) });
    switch (r.outcome) {
      case "claimed": return toast({ tone: "success", message: t("oq.t.claimed", { ref }) });
      case "released": return toast({ tone: "success", message: t("oq.t.released", { ref }) });
      case "mine": return toast({ tone: "info", message: t("oq.t.mine", { ref }) });
      case "taken": return toast({ tone: "error", ttl: 0, message: t("oq.t.taken", { ref, name: nameOf(r.by) }) });
      case "notMine": return toast({ tone: "error", ttl: 0, message: t("oq.t.notMine", { ref }) });
    }
  };

  const run = async (action: Action) => {
    const list = [...refs];
    let ok = 0;
    setRunning({ action, done: 0, n: list.length });
    for (const [i, ref] of list.entries()) {
      onBusy(ref, action === "claim" ? "claiming" : "releasing");
      let r: ClaimOutcome | null = null;
      try {
        r = await (action === "claim" ? claimGrievance : releaseGrievance)(username, ref);
      } catch {
        r = null;
      }
      onBusy(ref, null);
      if (r) onResult(r.item);
      if (r && (r.outcome === "claimed" || r.outcome === "released")) ok++;
      say(r, ref);
      setRunning({ action, done: i + 1, n: list.length });
    }
    toast({ tone: "info", message: t(action === "claim" ? "oq.t.claimSummary" : "oq.t.releaseSummary", { ok, n: list.length }) });
    setRunning(null);
    onDone();
  };

  const none = refs.length === 0 || running !== null;
  return (
    <div className={s.bulk}>
      <span className={s.bulkCount} aria-live="polite">
        {running ? t("oq.working", { done: running.done, n: running.n }) : t("oq.selected", { n: refs.length })}
      </span>
      <button type="button" className="btn btn-outline" disabled={none} onClick={() => run("claim")}>{t("oq.bulkClaim")}</button>
      <button type="button" className="btn btn-outline" disabled={none} onClick={() => run("release")}>{t("oq.bulkRelease")}</button>
    </div>
  );
}
