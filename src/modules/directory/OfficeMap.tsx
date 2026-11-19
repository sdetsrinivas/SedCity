"use client";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import geo from "@/mock/data/geo.json";
import { zones } from "@/mock/endpoints/geo";
import { OFFICE_KINDS, OFFICES, officeById, type LatLng } from "@/mock/endpoints/directory";
import { HEIGHT, WIDTH, wardShapes, zoneShapes } from "@/modules/grievance/mapGeometry";
import { isMapState, type MapEvent } from "./mapMessages";
import { toMapPoint } from "./offices";
import s from "./OfficeMap.module.css";

const KIND_CLASS: Record<string, string> = { head: s.head, zone: s.zone, ward: s.ward, csc: s.csc, water: s.water, health: s.health };

/**
 * The map shown in the offices page's map frame (FRM-04): wards, zone outlines and one marker per office.
 * It lives in its own document (/maps/offices). The page tells it which office to highlight and where the
 * user is; choosing a marker tells the page.
 */
export function OfficeMap() {
  const { t, lang } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [user, setUser] = useState<LatLng | null>(null);
  const zoneIds = useMemo(() => zones.map((z) => z.id), []);
  const wards = useMemo(() => wardShapes(geo.wards, zoneIds), [zoneIds]);
  const outlines = useMemo(() => zoneShapes(zoneIds), [zoneIds]);
  const pins = useMemo(() => OFFICES.map((o) => ({ office: o, ...toMapPoint(o) })), []);

  useEffect(() => {
    const parent = window.parent !== window ? window.parent : null;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== parent || !isMapState(e.data)) return;
      setSelectedId(e.data.selectedId);
      setUser(e.data.user);
    };
    window.addEventListener("message", onMessage);
    const ready: MapEvent = { source: "amc-map", type: "ready" };
    parent?.postMessage(ready, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const choose = (id: string) => {
    setSelectedId(id);
    const msg: MapEvent = { source: "amc-map", type: "select", id };
    if (window.parent !== window) window.parent.postMessage(msg, window.location.origin);
  };
  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(id);
    }
  };

  const selected = selectedId ? pins.find((p) => p.office.id === selectedId) : undefined;
  const userPoint = user ? toMapPoint(user) : null;
  const onMap = userPoint && userPoint.x >= 0 && userPoint.x <= WIDTH && userPoint.y >= 0 && userPoint.y <= HEIGHT;
  const anchor = (x: number) => (x < WIDTH * 0.3 ? "start" : x > WIDTH * 0.7 ? "end" : "middle");

  return (
    <div className={s.page}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={s.svg} role="group" aria-label={t("off.mapFrameTitle")}>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="10" className={s.bg} />
        {wards.map((w) => <path key={w.id} d={w.d} className={s.wardShape} />)}
        {outlines.map((z) => <path key={z.id} d={z.d} className={s.zoneLine} />)}
        {pins.map(({ office, x, y }) => (
          <g
            key={office.id}
            role="button"
            tabIndex={0}
            className={`${s.pin} ${KIND_CLASS[office.kind]} ${office.id === selectedId ? s.pinOn : ""}`}
            transform={`translate(${x} ${y})`}
            onClick={() => choose(office.id)}
            onKeyDown={(e) => onKey(e, office.id)}
          >
            <title>{pick(office.name, lang)}</title>
            <circle r="9" className={s.hit} />
            <circle r={office.id === selectedId ? 7 : office.kind === "head" || office.kind === "zone" ? 5 : 3.6} className={s.dot} />
          </g>
        ))}
        {onMap && (
          <g transform={`translate(${userPoint.x} ${userPoint.y})`} className={s.user}>
            <circle r="11" className={s.userHalo} />
            <circle r="5" className={s.userDot} />
            <text y="22" textAnchor={anchor(userPoint.x)} className={s.label}>{t("off.youAreHere")}</text>
          </g>
        )}
        {selected && (
          <text x={selected.x} y={selected.y - 13} textAnchor={anchor(selected.x)} className={`${s.label} ${s.labelOn}`}>
            {pick(selected.office.name, lang)}
          </text>
        )}
      </svg>
      <ul className={s.legend}>
        {OFFICE_KINDS.map((k) => (
          <li key={k.id}><span className={`${s.swatch} ${KIND_CLASS[k.id]}`} aria-hidden="true" />{pick(k, lang)}</li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">{selectedId ? pick(officeById(selectedId)!.name, lang) : ""}</p>
    </div>
  );
}
