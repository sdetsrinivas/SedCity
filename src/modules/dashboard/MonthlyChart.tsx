"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { CHART, barBoxes, niceMax } from "./data";
import s from "./Dashboard.module.css";

type Totals = { month: string; total: number }[];

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * OTH-15: payments per month drawn on a <canvas>. Bars, axis labels and the hover tooltip are pixels only:
 * nothing about them is in the DOM (the element has a fixed aria-label and no fallback content). Bar
 * geometry is `barBoxes()` in data.ts: plot from x = 64 to width − 12 and y = 16 to 192 (CSS px), equal slots
 * per month, bars 60% of a slot, scaled to `niceMax()`. Hovering a bar draws its month and amount; clicking
 * it narrows the period to that month. Redrawn on resize and theme change, at the device pixel ratio.
 */
export function MonthlyChart({ totals, onPick }: { totals: Totals; onPick: (month: string) => void }) {
  const { t, lang } = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [theme, setTheme] = useState(0);
  const locale = lang === "ta" ? "ta-IN" : "en-IN";

  useEffect(() => {
    const el = canvas.current!;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)));
    ro.observe(el);
    const mo = new MutationObserver(() => setTheme((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);

  const draw = useCallback(() => {
    const el = canvas.current;
    if (!el || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(width * dpr);
    el.height = Math.round(CHART.height * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, CHART.height);
    const c = { text: css("--c-muted"), grid: css("--c-border"), bar: css("--c-primary"), hot: css("--c-accent"), tipBg: css("--c-text"), tipInk: css("--c-surface") };
    const values = totals.map((m) => m.total);
    const max = niceMax(Math.max(0, ...values));
    const plotH = CHART.height - CHART.top - CHART.bottom;
    ctx.font = "12px system-ui, sans-serif";

    // Grid lines and amounts on the left.
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const y = CHART.top + plotH - (plotH * i) / 4;
      ctx.strokeStyle = c.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CHART.left, Math.round(y) + 0.5);
      ctx.lineTo(width - CHART.right, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.fillText(formatINR((max * i) / 4, true), CHART.left - 8, y);
    }

    // Bars and month labels (every label when they fit, else every other one, always ending with the last month).
    const boxes = barBoxes(width, values);
    const short = new Intl.DateTimeFormat(locale, { month: "short" });
    const step = boxes.length > 0 && boxes[0].w / 0.6 < 34 ? 2 : 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    boxes.forEach((b, i) => {
      ctx.fillStyle = i === hover ? c.hot : c.bar;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if ((boxes.length - 1 - i) % step === 0) {
        ctx.fillStyle = c.text;
        ctx.fillText(short.format(new Date(`${totals[i].month}-01T12:00:00`)), b.x + b.w / 2, CHART.top + plotH + 8);
      }
    });

    // Tooltip for the hovered month.
    if (hover !== null && boxes[hover]) {
      const b = boxes[hover];
      const label = `${new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${totals[hover].month}-01T12:00:00`))}: ${formatINR(totals[hover].total)}`;
      ctx.font = "600 12px system-ui, sans-serif";
      const w = ctx.measureText(label).width + 16;
      const x = Math.min(Math.max(b.x + b.w / 2 - w / 2, 4), width - w - 4);
      const y = Math.max(b.y - 34, 2);
      ctx.fillStyle = c.tipBg;
      ctx.fillRect(x, y, w, 26);
      ctx.fillStyle = c.tipInk;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 8, y + 13);
    }
    // `theme` is a dependency only so that a theme change redraws with the new colours.
  }, [width, totals, hover, locale, theme]);

  useEffect(draw, [draw]);

  /** The bar under a point (the whole slot counts, so short bars are easy to hit). */
  const barAt = (clientX: number, clientY: number) => {
    const r = canvas.current!.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    if (y < CHART.top || y > CHART.height - CHART.bottom) return null;
    const slot = (width - CHART.left - CHART.right) / Math.max(1, totals.length);
    const i = Math.floor((x - CHART.left) / slot);
    return i >= 0 && i < totals.length ? i : null;
  };

  return (
    <canvas
      ref={canvas}
      className={`${s.canvas} ${hover !== null ? s.canvasHot : ""}`}
      style={{ height: CHART.height }}
      role="img"
      aria-label={t("dash.pay.chartLabel")}
      onPointerMove={(e) => setHover(barAt(e.clientX, e.clientY))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => { const i = barAt(e.clientX, e.clientY); if (i !== null) onPick(totals[i].month); }}
    />
  );
}
