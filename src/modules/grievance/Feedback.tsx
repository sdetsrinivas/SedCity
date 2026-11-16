"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { rateResolution, type GrievanceRecord } from "@/mock/endpoints/grievance";
import { StarRating } from "./StarRating";
import { COMMENT_MAX, MAX_STARS } from "./tracking";
import s from "./Track.module.css";

/** "Rate the resolution" for a resolved grievance; once rated, the rating is shown read-only. */
export function Feedback({ record, onDone }: { record: GrievanceRecord; onDone: (g: GrievanceRecord) => void }) {
  const { t } = useT();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [thanked, setThanked] = useState(false);

  if (record.rating) {
    return (
      <div className={`${s.action} ${s.rated}`}>
        {thanked && <div className="alert alert-success" role="status">{t("gt.thanks")}</div>}
        <h3 className={s.subhead}>{t("gt.rateTitle")}</h3>
        <p className={s.ratedLine}>
          <span className={s.starsStatic} aria-hidden="true">
            {Array.from({ length: MAX_STARS }, (_, i) => (
              <Icon key={i} name="star" size={20} fill={i < record.rating! ? "currentColor" : "none"} className={i < record.rating! ? s.starOn : s.star} />
            ))}
          </span>
          <span id="gt-your-rating">{t("gt.yourRating", { n: record.rating, max: MAX_STARS })}</span>
        </p>
        {record.comment && <p className="small muted">“{record.comment}”</p>}
      </div>
    );
  }

  const submit = async () => {
    if (!rating) return setError("gt.errRating");
    setBusy(true);
    setError(null);
    try {
      const next = await rateResolution(record.ref, rating, comment.trim());
      setThanked(true);
      onDone(next);
    } catch {
      setError("gt.errFeedback");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`no-print ${s.action} ${s.panel}`} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <h3 className={s.subhead}>{t("gt.rateTitle")}</h3>
      <p className="small muted">{t("gt.rateIntro")}</p>
      <div className="field">
        <span className="label" id="gt-rating-label">{t("gt.rating")}</span>
        <StarRating value={rating} onChange={(n) => { setRating(n); setError(null); }} labelledBy="gt-rating-label" invalid={error === "gt.errRating"} />
        {error === "gt.errRating" && <span className="error" role="alert">{t(error, { max: MAX_STARS })}</span>}
      </div>
      <div className="field">
        <label htmlFor="gt-comment">{t("gt.comment")}</label>
        <textarea id="gt-comment" name="comment" className="input" rows={3} maxLength={COMMENT_MAX} value={comment}
          onChange={(e) => setComment(e.target.value)} aria-describedby="gt-comment-count" />
        <span className="help" id="gt-comment-count">{t("gt.commentCount", { n: comment.length, max: COMMENT_MAX })}</span>
      </div>
      {error === "gt.errFeedback" && <div className="alert alert-error" role="alert">{t(error)}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("gt.saving") : t("gt.submitFeedback")}</button>
    </form>
  );
}
