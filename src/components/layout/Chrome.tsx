"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides the portal shell (header, footer, consent banner, session watcher, shortcuts) on third-party
 * pages that live under this origin and run inside a frame or popup: the AstheenPay checkout at /pay/… and the
 * office map at /maps/… (shown in the map frame of /directory/offices) and the survey at /forms/… (in the
 * survey frame of /help/survey).
 */
export function Chrome({ header, footer, extras, children }: { header: ReactNode; footer: ReactNode; extras: ReactNode; children: ReactNode }) {
  const path = usePathname() ?? "";
  const bare = path.startsWith("/pay/") || path.startsWith("/maps/") || path.startsWith("/forms/");
  if (bare) return <main id="main" tabIndex={-1}>{children}</main>;
  return (
    <>
      {header}
      <main id="main" tabIndex={-1}>{children}</main>
      {footer}
      {extras}
    </>
  );
}
