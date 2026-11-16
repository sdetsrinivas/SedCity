"use client";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/client";
import { ToastProvider } from "@/components/ui/Toast";
import type { Lang } from "@/i18n";

export function Providers({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <I18nProvider lang={lang}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
