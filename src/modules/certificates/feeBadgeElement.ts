/**
 * SHD-03: `<amc-fee-badge>`, a native custom element whose content lives in a CLOSED shadow root.
 * `attachShadow({ mode: "closed" })` returns the root only to this class, so `host.shadowRoot` is
 * null and nothing outside can query into it; the light DOM of the host stays empty. The page sets
 * the `view` property (never attributes), so the amount is not in the host's markup either.
 * Theme colours come in through inherited CSS custom properties (--c-*), which do cross the boundary.
 */

export interface FeeBadgeView {
  state: "idle" | "loading" | "ready" | "error";
  label: string;
  /** Formatted amount, e.g. "₹1,700.00" (ready only). */
  amount?: string;
  /** "per year" etc. (ready only). */
  unit?: string;
  /** Idle / loading / error text, or the note under the amount. */
  note: string;
}

export const FEE_BADGE_TAG = "amc-fee-badge";

const STYLE = `
:host { display: block; }
.badge { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 10px;
  border: 1px solid var(--c-primary, #0d4a6b); background: var(--c-primary-soft, #e3eef4); color: var(--c-text, #1d2430);
  font: inherit; }
.seal { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  background: var(--c-primary, #0d4a6b); color: var(--c-primary-ink, #fff); font-weight: 800; font-size: 1.2rem; }
.badge[hidden], .main[hidden] { display: none; }
.text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.label { font-size: 0.8rem; font-weight: 600; color: var(--c-muted, #5b6474); text-transform: uppercase; letter-spacing: 0.04em; }
.amount { font-size: 1.35rem; font-weight: 800; color: var(--c-primary, #0d4a6b); font-variant-numeric: tabular-nums; }
.unit { font-size: 0.9rem; font-weight: 600; color: var(--c-muted, #5b6474); }
.note { font-size: 0.85rem; color: var(--c-muted, #5b6474); }
.badge[data-state="loading"] .seal { animation: pulse 1s ease-in-out infinite; }
.badge[data-state="error"] { border-color: var(--c-danger, #b42318); background: var(--c-danger-soft, #fdecea); }
@keyframes pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { .badge[data-state="loading"] .seal { animation: none; } }
`;

/** Defines the element once, in the browser only (the class needs HTMLElement). */
export function defineFeeBadge(): void {
  if (typeof window === "undefined" || customElements.get(FEE_BADGE_TAG)) return;

  class FeeBadge extends HTMLElement {
    // SHD-03: the only reference to the closed root.
    #root = this.attachShadow({ mode: "closed" });
    #view: FeeBadgeView | null = null;

    constructor() {
      super();
      this.#root.innerHTML = `<style>${STYLE}</style>
<div class="badge" data-state="idle" role="status" aria-live="polite" hidden>
  <span class="seal" aria-hidden="true">₹</span>
  <span class="text"><span class="label"></span><span class="main"><span class="amount"></span> <span class="unit"></span></span><span class="note"></span></span>
</div>`;
    }

    get view() { return this.#view; }
    set view(v: FeeBadgeView | null) {
      this.#view = v;
      this.#render();
    }

    #render() {
      const v = this.#view;
      const q = (sel: string) => this.#root.querySelector<HTMLElement>(sel)!;
      const badge = q(".badge");
      badge.hidden = !v;
      if (!v) return;
      badge.dataset.state = v.state;
      q(".label").textContent = v.label;
      const ready = v.state === "ready" && !!v.amount;
      q(".main").hidden = !ready;
      q(".amount").textContent = ready ? v.amount! : "";
      q(".unit").textContent = ready ? (v.unit ?? "") : "";
      q(".note").textContent = v.note;
    }
  }

  customElements.define(FEE_BADGE_TAG, FeeBadge);
}
