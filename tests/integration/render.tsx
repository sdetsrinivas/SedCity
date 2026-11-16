import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Providers } from "@/components/layout/Providers";
import type { Lang } from "@/i18n";

export function renderWithProviders(ui: ReactElement, lang: Lang = "en") {
  return render(<Providers lang={lang}>{ui}</Providers>);
}

export function captchaAnswer(container: HTMLElement): string {
  const token = (container.querySelector("input[name=captcha_token]") as HTMLInputElement).value;
  const c = JSON.parse(atob(token)) as { a: number; b: number; op: string };
  return String(c.op === "+" ? c.a + c.b : c.op === "-" ? c.a - c.b : c.a * c.b);
}
