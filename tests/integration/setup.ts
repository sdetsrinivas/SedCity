import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom has no canvas implementation; the CAPTCHA simply skips drawing.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  // All mock delays → 0 (toasts keep a real TTL so they don't become sticky).
  document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, delays: { TOAST_TTL: 3000 } }))}; path=/`;
  localStorage.clear();
  sessionStorage.clear();
  Object.values(router).forEach((f) => f.mockClear());
});

afterEach(() => cleanup());
