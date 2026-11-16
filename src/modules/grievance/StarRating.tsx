"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { MAX_STARS } from "./tracking";
import s from "./Track.module.css";

const captionKey = (n: number) => `gt.rate${n}` as DictKey;

/**
 * OTH-09: five stars in a `div[role=radiogroup]`; each star is a `span[role=radio]` with an SVG and an
 * aria-label ("3 out of 5 stars"), no text and no native input. Stars up to the chosen one are filled
 * (class only); hovering fills stars too without choosing anything. The value is in hidden input
 * `rating`. Keyboard: one tab stop (the chosen star, else the first); arrows move and choose, Space/Enter
 * choose the focused star.
 */
export function StarRating({ value, onChange, labelledBy, invalid }: {
  value: number; onChange: (n: number) => void; labelledBy: string; invalid?: boolean;
}) {
  const { t } = useT();
  const [hover, setHover] = useState(0);
  const stars = useRef<(HTMLSpanElement | null)[]>([]);
  const lit = hover || value;

  const pickAndFocus = (n: number) => {
    onChange(n);
    stars.current[n - 1]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLSpanElement>, n: number) => {
    const to =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? (n % MAX_STARS) + 1
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? ((n + MAX_STARS - 2) % MAX_STARS) + 1
      : e.key === "Home" ? 1
      : e.key === "End" ? MAX_STARS
      : e.key === " " || e.key === "Enter" ? n
      : 0;
    if (!to) return;
    e.preventDefault();
    pickAndFocus(to);
  };

  return (
    <div className={s.ratingRow}>
      <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalid || undefined} className={s.stars}
        onMouseLeave={() => setHover(0)}>
        {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            ref={(el) => { stars.current[n - 1] = el; }}
            role="radio"
            aria-checked={value === n}
            aria-label={t("gt.starN", { n, max: MAX_STARS })}
            tabIndex={(value ? value === n : n === 1) ? 0 : -1}
            className={`${s.star} ${n <= lit ? s.starOn : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => pickAndFocus(n)}
            onKeyDown={(e) => onKey(e, n)}
          >
            <Icon name="star" size={30} fill={n <= lit ? "currentColor" : "none"} />
          </span>
        ))}
      </div>
      <span className={s.ratingCaption} aria-hidden="true">{lit ? t(captionKey(lit)) : t("gt.notRated")}</span>
      <input type="hidden" name="rating" value={value || ""} />
    </div>
  );
}
