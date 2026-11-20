"use client";
import { useT } from "@/i18n/client";
import s from "./Officer.module.css";

export type RowBusy = "claiming" | "releasing" | null;

/**
 * BTN-07: Claim acts on a double-click only (`onDoubleClick`); a single click, Enter or Space does
 * nothing, so a stray click never takes a grievance. While the claim runs (QUEUE_CLAIM) the button reads
 * "Claiming…"; then the cell shows "You" and a Release button (a normal single click).
 * Grievances claimed by a colleague show the colleague's name and no button.
 */
export function ClaimCell({ claimedBy, mine, busy, describedBy, onClaim, onRelease }: {
  claimedBy: string | null;
  mine: boolean;
  busy: RowBusy;
  describedBy: string;
  onClaim: () => void;
  onRelease: () => void;
}) {
  const { t } = useT();
  if (busy) {
    return <button type="button" className={`btn btn-outline ${s.rowBtn}`} disabled aria-describedby={describedBy}>{t(busy === "claiming" ? "oq.claiming" : "oq.releasing")}</button>;
  }
  if (mine) {
    return (
      <span className={s.claimMine}>
        <span className={s.you}>{t("oq.byYou")}</span>
        <button type="button" className={`btn btn-ghost ${s.rowBtn}`} aria-describedby={describedBy} onClick={onRelease}>{t("oq.release")}</button>
      </span>
    );
  }
  if (claimedBy) return <span className="muted">{claimedBy}</span>;
  return (
    <button type="button" className={`btn btn-outline ${s.rowBtn}`} title={t("oq.claimTitle")} aria-describedby={describedBy} onDoubleClick={onClaim}>
      {t("oq.claim")}
    </button>
  );
}
