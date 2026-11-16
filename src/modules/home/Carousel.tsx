"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { delayFor } from "@/mock/api";
import { Icon, type IconName } from "@/components/ui/Icon";
import slides from "@/mock/data/carousel.json";
import s from "./Carousel.module.css";

/**
 * OTH-17: auto-rotating announcement carousel. Every slide stays in the DOM; inactive slides are
 * aria-hidden + `inert` and visually transparent, so a text match can hit a slide that isn't shown.
 * Rotation pauses while hovered/focused and when the pause button is pressed.
 */
export function Carousel() {
  const { t, lang } = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const n = slides.length;
  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || hover) return;
    const id = setTimeout(() => go(index + 1), delayFor("CAROUSEL_ROTATE"));
    return () => clearTimeout(id);
  }, [index, paused, hover, go]);

  return (
    <section
      className={s.carousel}
      aria-roledescription="carousel"
      aria-label={t("home.carouselLabel")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className={s.viewport} aria-live={paused ? "polite" : "off"}>
        {slides.map((sl, i) => (
          <article
            key={sl.id}
            className={`${s.slide} ${s[sl.tone]} ${i === index ? s.current : ""}`}
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${n}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            <div className={s.art} aria-hidden="true"><Icon name={sl.icon as IconName} size={120} strokeWidth={1.1} /></div>
            <div className={s.copy}>
              <h2>{pick(sl.title, lang)}</h2>
              <p>{pick(sl.body, lang)}</p>
              <Link href={sl.href} className={`btn ${s.cta}`}>{pick(sl.cta, lang)} <Icon name="arrowRight" size={16} /></Link>
            </div>
          </article>
        ))}
      </div>
      <div className={s.controls}>
        <button type="button" className={s.ctrl} aria-label={t("home.prevSlide")} onClick={() => go(index - 1)}><Icon name="chevronLeft" size={18} /></button>
        <div className={s.dots}>
          {slides.map((sl, i) => (
            <button key={sl.id} type="button" className={`${s.dot} ${i === index ? s.dotActive : ""}`} aria-label={`${t("home.goToSlide")} ${i + 1}`} aria-current={i === index} onClick={() => go(i)} />
          ))}
        </div>
        <button type="button" className={s.ctrl} aria-label={t("home.nextSlide")} onClick={() => go(index + 1)}><Icon name="chevronRight" size={18} /></button>
        <button type="button" className={s.ctrl} aria-label={paused ? t("home.playSlides") : t("home.pauseSlides")} onClick={() => setPaused((p) => !p)}>
          <Icon name={paused ? "play" : "pause"} size={16} />
        </button>
      </div>
    </section>
  );
}
