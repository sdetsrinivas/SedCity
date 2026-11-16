"use client";
import { lazy, memo, Suspense, type ComponentType } from "react";
import { delayFor } from "@/mock/api";
import type { DelayName } from "@/mock/delays";

/**
 * HYD helper: the wrapped component is fully server-rendered, but on the client its code chunk
 * is only resolved after the named delay. Until then React keeps the server HTML inside a
 * dehydrated Suspense boundary: it is visible but has no event handlers attached.
 * The island is memoised so parent re-renders don't force it to client-render early —
 * pass only stable props (or none) and read its value from the DOM / a stable callback.
 */
export function delayedIsland<P extends object>(name: DelayName, load: () => Promise<{ default: ComponentType<P> }>) {
  const Lazy = lazy(() =>
    typeof window === "undefined"
      ? load()
      : new Promise<{ default: ComponentType<P> }>((resolve) => setTimeout(() => resolve(load()), delayFor(name))),
  );
  return memo(function Island(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  });
}
