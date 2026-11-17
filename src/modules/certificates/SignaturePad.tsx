"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useT } from "@/i18n/client";
import { strokeLength } from "./trade";
import s from "./Certificates.module.css";

type Point = { x: number; y: number };

interface Props {
  /** Total stroke length in CSS pixels after every change (0 = empty). */
  onChange: (length: number) => void;
  error?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * OTH-05: a <canvas> signature pad driven only by Pointer Events (pointerdown / pointermove /
 * pointerup). The signature exists only as pixels and in this component's memory: no input, no
 * value, no text. Synthetic mouse events dispatched from script draw nothing; a real (or
 * driver-emulated) pointer drag does. Strokes are redrawn when the pad is resized.
 */
export function SignaturePad({ onChange, error, canvasRef }: Props) {
  const { t } = useT();
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const ratio = window.devicePixelRatio || 1;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 2.2;
    g.strokeStyle = getComputedStyle(c).color;
    for (const st of strokes.current) {
      g.beginPath();
      st.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      if (st.length === 1) g.lineTo(st[0].x + 0.1, st[0].y);
      g.stroke();
    }
  }, [canvasRef]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = c.getBoundingClientRect();
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    // Redraw in the new ink colour when the theme changes.
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [canvasRef, redraw]);

  const point = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const changed = () => {
    const len = strokeLength(strokes.current);
    setEmpty(strokes.current.length === 0);
    onChange(len);
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([point(e)]);
    redraw();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const st = strokes.current[strokes.current.length - 1];
    const p = point(e);
    const prev = st[st.length - 1];
    st.push(p);
    const g = ctx();
    if (g) { g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(p.x, p.y); g.stroke(); }
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    changed();
  };
  const clear = () => {
    strokes.current = [];
    redraw();
    changed();
  };

  return (
    <div className="field">
      <span className="label" id="tl-sign-label">{t("tl.signature")}</span>
      <canvas ref={canvasRef} id="tl-signature" className={s.signature} role="img" aria-labelledby="tl-sign-label"
        aria-describedby="tl-sign-help" aria-invalid={!!error}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className={s.signRow}>
        <span className="help" id="tl-sign-help">{t("tl.signatureHelp")}</span>
        <button type="button" className="btn btn-ghost" onClick={clear} disabled={empty}>{t("tl.signClear")}</button>
      </div>
      {error && <span className="error" id="tl-signature-error">{error}</span>}
    </div>
  );
}
