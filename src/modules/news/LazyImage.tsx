"use client";
import { useEffect, useRef, useState } from "react";
import s from "./News.module.css";

/** 1×1 transparent GIF shown until the real picture is wanted. */
export const PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * OTH-19 (lazy images): the card picture starts as a 1×1 placeholder with the real address in
 * `data-src`; it is swapped in only when the picture comes within 100px of the viewport.
 */
export function LazyImage({ src, alt }: { src: string; alt: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(PLACEHOLDER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = img.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setCurrent(src);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCurrent(src);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 100px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={current}
      data-src={src}
      alt={alt}
      width={480}
      height={270}
      className={`${s.picture} ${loaded ? s.pictureLoaded : ""}`}
      onLoad={() => setLoaded(current !== PLACEHOLDER)}
    />
  );
}
