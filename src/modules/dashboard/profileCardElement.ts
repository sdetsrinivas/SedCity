/**
 * SHD-04: `<amc-profile-card>`, a native custom element with an OPEN shadow root that only provides the
 * card's frame: the initials circle, the status line (“Verified citizen”) and three <slot>s. The citizen's
 * name (`slot="name"`), ward (`slot="meta"`) and the contact form (default slot) stay in the LIGHT DOM of
 * the host and are only *rendered* inside the shadow tree. So the form fields are found with ordinary
 * selectors, while the status text and the initials exist only inside `host.shadowRoot`.
 * Attributes: `initials`, `status-label`. Theme colours come in through inherited CSS custom properties.
 */

export const PROFILE_CARD_TAG = "amc-profile-card";

const STYLE = `
:host { display: block; }
.frame { background: var(--c-surface, #fff); border: 1px solid var(--c-border, #d9d3c7); border-radius: 12px; overflow: hidden; color: var(--c-text, #1d2430); }
.top { display: flex; gap: 14px; align-items: center; padding: 18px 20px 14px; background: var(--c-primary-soft, #e3eef4); border-bottom: 1px solid var(--c-border, #d9d3c7); }
.avatar { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%;
  background: var(--c-primary, #0d4a6b); color: var(--c-primary-ink, #fff); font-weight: 800; font-size: 1.15rem; letter-spacing: 0.02em; }
.who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.status { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 0.78rem; font-weight: 700; color: var(--c-green, #2f7a3d); }
.status svg { flex: none; }
.body { padding: 16px 20px 4px; }
::slotted([slot="name"]) { margin: 0; font-size: 1.1rem; overflow-wrap: anywhere; }
::slotted([slot="meta"]) { margin: 0; font-size: 0.88rem; color: var(--c-muted, #5b6474); }
`;

/** Defines the element once, in the browser only (the class needs HTMLElement). */
export function defineProfileCard(): void {
  if (typeof window === "undefined" || customElements.get(PROFILE_CARD_TAG)) return;

  class ProfileCard extends HTMLElement {
    static observedAttributes = ["initials", "status-label"];

    constructor() {
      super();
      // SHD-04: open root; the light-DOM children are projected through the slots below.
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${STYLE}</style>
<div class="frame" part="frame">
  <div class="top">
    <div class="avatar" aria-hidden="true"></div>
    <div class="who">
      <slot name="name"></slot>
      <slot name="meta"></slot>
      <span class="status"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="status-text"></span></span>
    </div>
  </div>
  <div class="body"><slot></slot></div>
</div>`;
    }

    connectedCallback() { this.#render(); }
    attributeChangedCallback() { this.#render(); }

    #render() {
      const root = this.shadowRoot!;
      root.querySelector(".avatar")!.textContent = this.getAttribute("initials") ?? "";
      root.querySelector(".status-text")!.textContent = this.getAttribute("status-label") ?? "";
    }
  }

  customElements.define(PROFILE_CARD_TAG, ProfileCard);
}
