"use client";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { formatINR } from "@/lib/format";
import { amenityById, type Venue } from "./booking";
import s from "./Bookings.module.css";

/** Plus in a circle (not chosen) and tick in a filled circle (chosen): the only visible state. */
const PLUS = "M12 7v10M7 12h10";
const TICK = "M7 12.5l3.2 3.2L17 9";

/**
 * CHK-07: optional amenities as tiles. A tile is a plain focusable <div> with no role, no aria-checked and
 * no input; whether it is chosen shows only as an extra hashed CSS-module class and a different SVG path
 * (plus → tick). Click, Enter or Space toggles it. The choice is visible elsewhere only in the fee summary.
 */
export function AmenityTiles({ venue, value, onChange }: { venue: Venue; value: string[]; onChange: (ids: string[]) => void }) {
  const { t, lang } = useT();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className={s.tiles}>
      {venue.amenities.map((id) => {
        const a = amenityById(id)!;
        const on = value.includes(id);
        return (
          <div
            key={id}
            tabIndex={0}
            className={on ? `${s.tile} ${s.tileOn}` : s.tile}
            onClick={() => toggle(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); }
            }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" className={s.tileMark} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d={on ? TICK : PLUS} />
            </svg>
            <span className={s.tileName}>{pick(a, lang)}</span>
            <span className={s.tileFee}>{t("bk.amenityFee", { fee: formatINR(a.fee, true) })}</span>
          </div>
        );
      })}
    </div>
  );
}
