"use client";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import items from "@/mock/data/ticker.json";

export function TickerHost() {
  const ref = useRef<HTMLDivElement>(null);
  const { t, lang } = useT();
  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;
    import("@/vanilla/news-ticker.js").then(({ mountTicker }) => {
      if (cancelled || !ref.current) return;
      destroy = mountTicker(ref.current, {
        label: t("home.tickerLabel"),
        pauseText: lang === "ta" ? "நிறுத்து" : "Pause",
        playText: lang === "ta" ? "இயக்கு" : "Play",
        items: items.map((i) => ({ text: pick(i, lang), href: i.href })),
      });
    });
    return () => { cancelled = true; destroy?.(); };
  }, [lang, t]);
  return <div ref={ref} id="latest-updates" style={{ minHeight: 38 }} />;
}
