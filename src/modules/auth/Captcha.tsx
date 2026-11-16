"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "@/components/ui/Icon";
import { type Challenge } from "@/lib/captcha";
import s from "./Auth.module.css";

/**
 * OTH-14: the arithmetic question exists only as canvas pixels (no text in the DOM).
 * The operands travel in the hidden `captcha_token` input (base64 JSON) for submit-time checking.
 */
export function Captcha({ challenge, token, onRefresh }: { challenge: Challenge | null; token: string; onRefresh: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.("2d");
    if (!canvas || !ctx || !challenge) return;
    const w = canvas.width, h = canvas.height;
    let seed = challenge.ts % 2147483647;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#f4efe2");
    g.addColorStop(1, "#e3eef4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `hsla(${Math.floor(rnd() * 360)},40%,45%,0.45)`;
      ctx.lineWidth = 1 + rnd() * 1.5;
      ctx.beginPath();
      ctx.moveTo(rnd() * w, rnd() * h);
      ctx.bezierCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h, rnd() * w, rnd() * h);
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(30,40,60,${0.15 + rnd() * 0.25})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
    }
    const text = `${challenge.a} ${challenge.op} ${challenge.b} = ?`;
    let x = 14;
    for (const ch of text) {
      ctx.save();
      const size = 22 + Math.floor(rnd() * 6);
      ctx.font = `700 ${size}px Georgia, serif`;
      ctx.fillStyle = `hsl(${200 + Math.floor(rnd() * 40)},55%,${22 + Math.floor(rnd() * 15)}%)`;
      ctx.translate(x, h / 2 + 8 + (rnd() - 0.5) * 8);
      ctx.rotate((rnd() - 0.5) * 0.5);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += ch === " " ? 8 : size * 0.62;
    }
  }, [challenge]);

  return (
    <div className={s.captchaRow}>
      <canvas ref={ref} width={190} height={52} className={s.captcha} role="img" aria-label={t("login.captchaImage")} />
      <button type="button" className="icon-btn" aria-label={t("login.captchaRefresh")} title={t("login.captchaRefresh")} onClick={onRefresh}>
        <Icon name="refresh" size={18} />
      </button>
      <input type="hidden" name="captcha_token" value={token} />
    </div>
  );
}
