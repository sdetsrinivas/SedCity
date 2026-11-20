/**
 * SHD-01: `<amc-help-chat>`, the Help centre's chat assistant, is a native custom element with an OPEN
 * shadow root. Everything a citizen sees (header, conversation, quick replies, question box, End chat)
 * is inside `host.shadowRoot`; the host's light DOM stays empty. `document.querySelector`, XPath and
 * `document.getElementById('chat-input')` find none of it; ids inside the root are scoped to the root.
 *
 * The React wrapper (HelpChat.tsx) owns the conversation and sets the `view` property; the element owns
 * its form fields and reports what the citizen does with composed events:
 *   `chat-send` {text, topic?} · `chat-end` {transcript, email} · `chat-restart`.
 * Theme colours come in through inherited CSS custom properties (--c-*), the font and `lang` are inherited.
 */
import { defineQuickReplies, QUICK_REPLIES_TAG, type QuickReply, type QuickReplyDetail } from "./quickRepliesElement";

export const HELP_CHAT_TAG = "amc-help-chat";

export interface ChatStrings {
  title: string;
  status: string;
  log: string;
  you: string;
  assistant: string;
  typing: string;
  quick: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  transcript: string;
  email: string;
  end: string;
  sending: string;
  restart: string;
}

export interface ChatMessage {
  id: number;
  from: "user" | "bot" | "system";
  text: string;
  link?: { href: string; label: string };
}

export interface ChatView {
  strings: ChatStrings;
  messages: ChatMessage[];
  replies: QuickReply[];
  /** The assistant is preparing a reply (Send and the quick replies are disabled). */
  typing: boolean;
  phase: "open" | "sending" | "ended";
  /** Problem with the transcript request (shown under End chat). */
  error: string;
}

export interface ChatSendDetail { text: string; topic?: string }
export interface ChatEndDetail { transcript: boolean; email: string }

const STYLE = `
:host { display: block; color: var(--c-text, #1d2430); }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.chat { display: flex; flex-direction: column; background: var(--c-surface, #fff); border: 1px solid var(--c-border, #d9d3c7);
  border-radius: var(--radius-lg, 10px); box-shadow: var(--shadow-1, none); overflow: hidden; }
.head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--c-primary, #0d4a6b); color: var(--c-primary-ink, #fff); }
.avatar { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: var(--c-primary-ink, #fff); color: var(--c-primary, #0d4a6b); font-weight: 800; font-size: 1.1rem; }
.head h2 { margin: 0; font-size: 1rem; line-height: 1.3; }
.status { margin: 2px 0 0; font-size: 0.8rem; opacity: 0.9; display: flex; align-items: center; gap: 6px; }
.status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c-green, #2f7a3d); box-shadow: 0 0 0 2px var(--c-primary-ink, #fff); }
.log { list-style: none; margin: 0; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  height: 340px; overflow-y: auto; background: var(--c-bg, #f5f3ee); overscroll-behavior: contain; }
.msg { max-width: 88%; padding: 9px 12px; border-radius: 12px; font-size: 0.92rem; line-height: 1.45; overflow-wrap: anywhere; }
.msg p { margin: 0; }
.bot { align-self: flex-start; background: var(--c-surface, #fff); border: 1px solid var(--c-border, #d9d3c7); border-bottom-left-radius: 4px; }
.user { align-self: flex-end; background: var(--c-primary, #0d4a6b); color: var(--c-primary-ink, #fff); border-bottom-right-radius: 4px; }
.system { align-self: center; max-width: 100%; text-align: center; font-size: 0.85rem; color: var(--c-muted, #5b6474); background: transparent; padding: 4px 8px; }
.msg a { display: inline-block; margin-top: 6px; color: var(--c-primary, #0d4a6b); font-weight: 600; }
.typing { margin: 0; padding: 0 16px 8px; background: var(--c-bg, #f5f3ee); font-size: 0.85rem; color: var(--c-muted, #5b6474); font-style: italic; }
.replies { padding: 12px 16px 4px; border-top: 1px solid var(--c-border, #d9d3c7); }
.compose { display: flex; gap: 8px; padding: 12px 16px; }
.compose input { flex: 1; min-width: 0; min-height: 42px; padding: 8px 12px; font: inherit; color: inherit;
  background: var(--c-surface, #fff); border: 1px solid var(--c-border, #d9d3c7); border-radius: var(--radius, 6px); }
.compose input:focus { outline: none; border-color: var(--c-primary, #0d4a6b); box-shadow: 0 0 0 3px var(--c-primary-soft, #e3eef4); }
button { font: inherit; font-weight: 600; min-height: 42px; padding: 0 16px; border-radius: var(--radius, 6px); cursor: pointer; }
button:focus-visible, input:focus-visible { outline: 3px solid var(--c-focus, #f2b632); outline-offset: 2px; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.send { border: 1px solid var(--c-primary, #0d4a6b); background: var(--c-primary, #0d4a6b); color: var(--c-primary-ink, #fff); }
.end { display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 16px; border-top: 1px solid var(--c-border, #d9d3c7); background: var(--c-surface-2, #f0ede6); }
.check { display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; cursor: pointer; }
.check input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--c-primary, #0d4a6b); }
.email { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; font-weight: 600; }
.email input { min-height: 40px; padding: 6px 10px; font: inherit; font-weight: 400; color: inherit;
  background: var(--c-surface, #fff); border: 1px solid var(--c-border, #d9d3c7); border-radius: var(--radius, 6px); }
.error { margin: 0; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--c-danger, #b42318); background: var(--c-danger-soft, #fdecea); border-radius: var(--radius, 6px); }
.ghost { align-self: flex-start; border: 1px solid var(--c-primary, #0d4a6b); background: transparent; color: var(--c-primary, #0d4a6b); }
.closed { padding: 12px 16px 16px; border-top: 1px solid var(--c-border, #d9d3c7); }
`;

const TEMPLATE = `<style>${STYLE}</style>
<section class="chat" aria-labelledby="chat-title">
  <header class="head">
    <span class="avatar" aria-hidden="true"></span>
    <div><h2 id="chat-title"></h2><p class="status"></p></div>
  </header>
  <ol class="log" role="log" aria-live="polite" tabindex="0"></ol>
  <p class="typing" role="status" hidden></p>
  <div class="open-only">
    <div class="replies"><${QUICK_REPLIES_TAG}></${QUICK_REPLIES_TAG}></div>
    <form class="compose" novalidate>
      <label class="sr-only" for="chat-input"></label>
      <input id="chat-input" name="question" type="text" autocomplete="off" maxlength="200" enterkeyhint="send">
      <button class="send" type="submit" disabled></button>
    </form>
    <div class="end">
      <label class="check"><input id="chat-transcript" name="transcript" type="checkbox"><span class="transcript-text"></span></label>
      <label class="email" hidden><span class="email-text"></span><input id="chat-email" name="email" type="email" autocomplete="email" inputmode="email"></label>
      <p class="error" role="alert" hidden></p>
      <button class="ghost end-chat" type="button"></button>
    </div>
  </div>
  <div class="closed" hidden><button class="ghost restart" type="button"></button></div>
</section>`;

/** Defines the element once, in the browser only (the class needs HTMLElement). */
export function defineHelpChat(): void {
  if (typeof window === "undefined" || customElements.get(HELP_CHAT_TAG)) return;
  defineQuickReplies();

  class HelpChat extends HTMLElement {
    #view: ChatView | null = null;
    #shown = 0;
    #phase: ChatView["phase"] = "open";
    readonly #root: ShadowRoot;

    constructor() {
      super();
      // SHD-01: an open root; the light DOM of the host stays empty.
      this.#root = this.attachShadow({ mode: "open" });
      this.#root.innerHTML = TEMPLATE;
      const input = this.#q<HTMLInputElement>("#chat-input");
      const box = this.#q<HTMLInputElement>("#chat-transcript");

      // TXT-07: Send follows the `input` event; a value set from script without one leaves it disabled.
      input.addEventListener("input", () => this.#syncSend());
      this.#q<HTMLFormElement>(".compose").addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !this.#canAsk()) return;
        this.#emit<ChatSendDetail>("chat-send", { text });
        input.value = "";
        this.#syncSend();
        input.focus();
      });
      this.#root.addEventListener("quick-reply", (e) => {
        const { topic, label } = (e as CustomEvent<QuickReplyDetail>).detail;
        e.stopPropagation();
        if (this.#canAsk()) this.#emit<ChatSendDetail>("chat-send", { text: label, topic });
      });
      // CHK-05: the transcript box (and the email field it reveals) exist only inside this root.
      box.addEventListener("change", () => {
        this.#q(".email").hidden = !box.checked;
        this.#q(".error").hidden = true;
      });
      this.#q(".end-chat").addEventListener("click", () => {
        this.#emit<ChatEndDetail>("chat-end", { transcript: box.checked, email: this.#q<HTMLInputElement>("#chat-email").value });
      });
      this.#q(".restart").addEventListener("click", () => this.#emit("chat-restart", {}));
    }

    get view() { return this.#view; }
    set view(v: ChatView | null) {
      this.#view = v;
      this.#render();
    }

    #q<T extends Element = HTMLElement>(sel: string): T {
      return this.#root.querySelector<T>(sel)!;
    }

    #emit<D>(type: string, detail: D) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }

    #canAsk() {
      return !!this.#view && !this.#view.typing && this.#view.phase === "open";
    }

    #syncSend() {
      this.#q<HTMLButtonElement>(".send").disabled = !this.#q<HTMLInputElement>("#chat-input").value.trim() || !this.#canAsk();
    }

    #render() {
      const v = this.#view;
      if (!v) return;
      const s = v.strings;
      this.#q(".avatar").textContent = s.title.slice(0, 1);
      this.#q("#chat-title").textContent = s.title;
      this.#q(".status").textContent = s.status;
      this.#q(".log").setAttribute("aria-label", s.log);
      this.#q("label[for=chat-input]").textContent = s.inputLabel;
      this.#q<HTMLInputElement>("#chat-input").placeholder = s.placeholder;
      this.#q(".send").textContent = s.send;
      this.#q(".transcript-text").textContent = s.transcript;
      this.#q(".email-text").textContent = s.email;
      this.#q(".restart").textContent = s.restart;

      const typing = this.#q(".typing");
      typing.hidden = !v.typing;
      typing.textContent = v.typing ? s.typing : "";

      const replies = this.#q<HTMLElement & { options: QuickReply[]; disabled: boolean; label: string }>(QUICK_REPLIES_TAG);
      replies.label = s.quick;
      replies.options = v.replies;
      replies.disabled = !this.#canAsk();

      const ended = v.phase === "ended";
      if (this.#phase === "ended" && !ended) this.#reset();
      this.#phase = v.phase;
      this.#q(".open-only").hidden = ended;
      this.#q(".closed").hidden = !ended;
      const end = this.#q<HTMLButtonElement>(".end-chat");
      end.disabled = v.phase === "sending";
      end.textContent = v.phase === "sending" ? s.sending : s.end;
      for (const sel of ["#chat-transcript", "#chat-email"]) this.#q<HTMLInputElement>(sel).disabled = v.phase === "sending";
      const error = this.#q(".error");
      error.hidden = !v.error;
      error.textContent = v.error;

      this.#renderLog(v);
      this.#syncSend();
    }

    #renderLog(v: ChatView) {
      const log = this.#q(".log");
      log.replaceChildren(...v.messages.map((m) => {
        const li = document.createElement("li");
        li.className = `msg ${m.from}`;
        if (m.from !== "system") {
          const who = document.createElement("span");
          who.className = "sr-only";
          who.textContent = `${m.from === "user" ? v.strings.you : v.strings.assistant}: `;
          li.append(who);
        }
        const p = document.createElement("p");
        p.textContent = m.text;
        li.append(p);
        if (m.link) {
          const a = document.createElement("a");
          a.href = m.link.href;
          a.textContent = m.link.label;
          li.append(a);
        }
        return li;
      }));
      if (v.messages.length !== this.#shown) log.scrollTop = log.scrollHeight;
      this.#shown = v.messages.length;
    }

    /** A new conversation starts with empty fields. */
    #reset() {
      this.#q<HTMLInputElement>("#chat-input").value = "";
      this.#q<HTMLInputElement>("#chat-transcript").checked = false;
      this.#q<HTMLInputElement>("#chat-email").value = "";
      this.#q(".email").hidden = true;
    }
  }

  customElements.define(HELP_CHAT_TAG, HelpChat);
}
