"use client";
import { useLayoutEffect, useRef } from "react";
import { delayFor } from "@/mock/api";

/**
 * DYN-07: slides elements to their new place after a render that moved them (FLIP: measure the old
 * `offsetTop`, jump back with a transform, then transition to none over QUEUE_REORDER). Elements are
 * registered by key through the returned callback ref.
 */
export function useFlip() {
  const els = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const ms = delayFor("QUEUE_REORDER");
    const still = ms <= 0 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const seen = new Map<string, number>();
    for (const [key, el] of els.current) {
      const top = el.offsetTop;
      seen.set(key, top);
      const before = tops.current.get(key);
      if (still || before === undefined || before === top) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${before - top}px)`;
      void el.offsetHeight;
      el.style.transition = `transform ${ms}ms ease-in-out`;
      el.style.transform = "";
    }
    tops.current = seen;
  });

  return (key: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(key, el);
    else els.current.delete(key);
  };
}
