"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides the portal shell (header, footer, consent banner, session watcher, shortcuts) on third-party
 * pages that live under this origin, i.e. the AstheenPay checkout at /pay/…, which runs in an iframe or popup.
 */
export function Chrome({ header, footer, extras, children }: { header: ReactNode; footer: ReactNode; extras: ReactNode; children: ReactNode }) {
  const bare = usePathname()?.startsWith("/pay/") ?? false;
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
