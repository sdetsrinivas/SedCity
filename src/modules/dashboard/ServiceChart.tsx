"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { formatINR } from "@/lib/format";
import type { PayService } from "./data";
import s from "./Dashboard.module.css";

const ROW = 46;

/**
 * OTH-16: totals by service as an inline SVG bar chart. Each service is a `<g>` with the service name and
 * the amount as SVG `<text>` and the bar as a `<rect>` whose width is proportional to the amount (the
 * largest service fills the width). Drawn in real pixels for the measured width, so text never scales.
 */
export function ServiceChart({ totals }: { totals: { service: PayService; total: number; count: number }[] }) {
  const { t } = useT();
  const uid = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(0, ...totals.map((x) => x.total));
  const height = Math.max(1, totals.length) * ROW;
  return (
    <div ref={box} className={s.svgBox}>
      {totals.length === 0 && <p className="muted small">{t("dash.pay.none")}</p>}
      {width > 0 && totals.length > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t`} className={s.svgChart}>
          <title id={`${uid}t`}>{t("dash.pay.byService")}</title>
          {totals.map((x, i) => {
            const y = i * ROW;
            return (
              <g key={x.service} className={s[`svc_${x.service.replace("-", "")}`]}>
                <text x={0} y={y + 16} className={s.svgLabel}>{t(`dash.svc.${x.service}` as DictKey)}</text>
                <text x={width} y={y + 16} textAnchor="end" className={s.svgAmount}>{formatINR(x.total)}</text>
                <rect x={0} y={y + 24} width={max > 0 ? Math.max(2, (x.total / max) * width) : 0} height={12} rx={3} className={s.svgBar} />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
