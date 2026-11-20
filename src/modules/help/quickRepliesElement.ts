/**
 * SHD-02: the chat's quick replies are two more levels of OPEN shadow roots inside `<amc-help-chat>`'s own:
 *   amc-help-chat #shadow-root → amc-quick-replies #shadow-root → amc-reply-chip #shadow-root → <button>
 * Each chip's label exists only as the text of the button in the chip's root (no slot, no light DOM),
 * so reaching a button takes one `shadowRoot` hop per level. A click sends a `quick-reply` event that is
 * `composed`, so it crosses every boundary and the chat (and anything above it) receives it.
 * Theme colours come in through inherited CSS custom properties (--c-*).
 */

export const QUICK_REPLIES_TAG = "amc-quick-replies";
export const REPLY_CHIP_TAG = "amc-reply-chip";

export interface QuickReply {
  topic: string;
  label: string;
}

export type QuickReplyDetail = QuickReply;

const CHIP_STYLE = `
:host { display: inline-block; }
button { font: inherit; font-size: 0.88rem; font-weight: 600; line-height: 1.25; padding: 7px 12px; min-height: 36px;
  border-radius: 999px; border: 1px solid var(--c-primary, #0d4a6b); background: var(--c-surface, #fff);
  color: var(--c-primary, #0d4a6b); cursor: pointer; text-align: left; }
button:hover:not(:disabled) { background: var(--c-primary-soft, #e3eef4); }
button:focus-visible { outline: 3px solid var(--c-focus, #f2b632); outline-offset: 2px; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const LIST_STYLE = `
:host { display: block; }
:host([hidden]) { display: none; }
.list { display: flex; flex-wrap: wrap; gap: 8px; }
`;

/** Defines both elements once, in the browser only. */
export function defineQuickReplies(): void {
  if (typeof window === "undefined") return;

  if (!customElements.get(REPLY_CHIP_TAG)) {
    class ReplyChip extends HTMLElement {
      static observedAttributes = ["label", "disabled"];
      #button: HTMLButtonElement;

      constructor() {
        super();
        // SHD-02 (third level): the button and its text live only in the chip's own open root.
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${CHIP_STYLE}</style><button type="button" part="chip"></button>`;
        this.#button = root.querySelector("button")!;
        this.#button.addEventListener("click", () => {
          const detail: QuickReplyDetail = { topic: this.getAttribute("topic") ?? "", label: this.getAttribute("label") ?? "" };
          this.dispatchEvent(new CustomEvent("quick-reply", { detail, bubbles: true, composed: true }));
        });
      }

      connectedCallback() { this.#render(); }
      attributeChangedCallback() { this.#render(); }

      #render() {
        this.#button.textContent = this.getAttribute("label") ?? "";
        this.#button.disabled = this.hasAttribute("disabled");
      }
    }
    customElements.define(REPLY_CHIP_TAG, ReplyChip);
  }

  if (!customElements.get(QUICK_REPLIES_TAG)) {
    class QuickReplies extends HTMLElement {
      #list: HTMLElement;
      #options: QuickReply[] = [];
      #disabled = false;

      constructor() {
        super();
        // SHD-02 (second level): the chips are children of this element's open root, not of its light DOM.
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${LIST_STYLE}</style><div class="list" role="group"></div>`;
        this.#list = root.querySelector(".list")!;
      }

      set label(v: string) { this.#list.setAttribute("aria-label", v); }

      get options() { return this.#options; }
      set options(v: QuickReply[]) {
        // Same chips as before: keep the elements (and any focus inside them).
        if (JSON.stringify(v) === JSON.stringify(this.#options)) {
          this.#apply();
          return;
        }
        this.#options = v;
        this.#list.replaceChildren(...v.map((o) => {
          const chip = document.createElement(REPLY_CHIP_TAG);
          chip.setAttribute("topic", o.topic);
          chip.setAttribute("label", o.label);
          return chip;
        }));
        this.#apply();
      }

      get disabled() { return this.#disabled; }
      set disabled(v: boolean) {
        this.#disabled = v;
        this.#apply();
      }

      #apply() {
        for (const chip of this.#list.children) chip.toggleAttribute("disabled", this.#disabled);
        this.hidden = this.#options.length === 0;
      }
    }
    customElements.define(QUICK_REPLIES_TAG, QuickReplies);
  }
}
