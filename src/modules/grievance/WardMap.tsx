"use client";
import { forwardRef, useMemo } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { wardById, zones } from "@/mock/endpoints/geo";
import geo from "@/mock/data/geo.json";
import { HEIGHT, WIDTH, wardShapes, zoneShapes } from "./mapGeometry";
import s from "./Grievance.module.css";

/**
 * OTH-06: the ward is chosen on an inline SVG map. Each ward is a <path> (no id) whose name is only in a
 * child <title>; the ward number is a separate <text> drawn over it with pointer-events:none. The SVG
 * elements live in the SVG namespace, so an XPath such as //path or //svg matches nothing in an HTML
 * document; the selected ward is shown in the output below the map and kept in a hidden input.
 */
export const WardMap = forwardRef<HTMLDivElement, { value: string; onChange: (id: string) => void }>(function WardMap({ value, onChange }, ref) {
  const { t, lang } = useT();
  const zoneIds = useMemo(() => zones.map((z) => z.id), []);
  const shapes = useMemo(() => wardShapes(geo.wards, zoneIds), [zoneIds]);
  const outlines = useMemo(() => zoneShapes(zoneIds), [zoneIds]);
  const selected = value ? wardById(value) : undefined;

  return (
    <div className="field">
      <span className="label" id="gr-ward-label">{t("gr.ward")}</span>
      <div ref={ref} tabIndex={-1} className={s.mapBox}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={s.map} aria-labelledby="gr-ward-label" role="group">
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="10" className={s.mapBg} />
          {shapes.map((w) => {
            const ward = wardById(w.id)!;
            const on = w.id === value;
            return (
              <path
                key={w.id}
                d={w.d}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                className={`${s.ward} ${on ? s.wardOn : ""}`}
                onClick={() => onChange(w.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(w.id); }
                }}
              >
                <title>{pick(ward, lang)}</title>
              </path>
            );
          })}
          {outlines.map((z) => <path key={z.id} d={z.d} className={s.zoneLine} aria-hidden="true" />)}
          {shapes.map((w) => (
            <text key={w.id} x={w.cx} y={w.cy} className={`${s.wardNo} ${w.id === value ? s.wardNoOn : ""}`} aria-hidden="true">{w.no}</text>
          ))}
        </svg>
      </div>
      <div className={s.mapFoot}>
        <span className="small muted">{t("gr.wardSelected")}</span>{" "}
        <output id="gr-ward-selected" htmlFor="gr-ward" className={s.wardReadout}>{selected ? pick(selected, lang) : t("gr.wardNone")}</output>
        {selected && <span className="small muted"> · {pick(zones.find((z) => z.id === selected.zoneId)!, lang)}</span>}
      </div>
      <input type="hidden" id="gr-ward" name="ward" value={value} />
    </div>
  );
});
