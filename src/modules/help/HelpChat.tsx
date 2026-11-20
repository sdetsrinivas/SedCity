"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";
import { useT } from "@/i18n/client";
import type { DictKey } from "@/i18n";
import { askAssistant, sendTranscript } from "@/mock/endpoints/help";
import { isEmail, offerable, START_TOPICS, TOPIC_LABEL, type TopicId } from "./chatBot";
import { defineHelpChat, type ChatEndDetail, type ChatMessage, type ChatSendDetail, type ChatStrings, type ChatView } from "./chatElement";
import s from "./Help.module.css";

type HelpChatElement = HTMLElement & { view: ChatView | null };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "amc-help-chat": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

/** A message as stored here: bot and closing lines keep their dictionary keys, so a language switch re-words them. */
type Line =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "bot"; key: DictKey; link?: { href: string; label: DictKey } }
  | { id: number; from: "system"; key: DictKey; vars?: Record<string, string> };

type NewLine = Line extends infer L ? (L extends Line ? Omit<L, "id"> : never) : never;

const GREETING: Line = { id: 0, from: "bot", key: "help.bot.welcome" };

/**
 * SHD-01 / SHD-02 / TXT-07 / CHK-05: “Chat with us” on /help. The conversation lives here; the
 * `<amc-help-chat>` element (open shadow root, see chatElement.ts) shows it and reports questions,
 * quick replies and End chat as events. Replies come from the mock help desk after CHAT_REPLY (1–2s).
 */
export function HelpChat() {
  const { t } = useT();
  const ref = useRef<HelpChatElement>(null);
  const nextId = useRef(1);
  /** Bumped when a conversation ends or restarts, so a late reply for the old one is dropped. */
  const conversation = useRef(0);
  const [lines, setLines] = useState<Line[]>([GREETING]);
  const [topics, setTopics] = useState<TopicId[]>(START_TOPICS);
  const [typing, setTyping] = useState(false);
  const [phase, setPhase] = useState<ChatView["phase"]>("open");
  const [error, setError] = useState<{ key: DictKey } | null>(null);

  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const add = useCallback((line: NewLine) => {
    const full = { ...line, id: nextId.current++ } as Line;
    setLines((ls) => [...ls, full]);
  }, []);

  const textOf = useCallback((l: Line) => (l.from === "user" ? l.text : t(l.key, l.from === "system" ? l.vars : undefined)), [t]);

  const strings = useMemo<ChatStrings>(() => ({
    title: t("help.chat.title"),
    status: t("help.chat.status"),
    log: t("help.chat.log"),
    you: t("help.chat.you"),
    assistant: t("help.chat.assistant"),
    typing: t("help.chat.typing"),
    quick: t("help.chat.quick"),
    inputLabel: t("help.chat.inputLabel"),
    placeholder: t("help.chat.placeholder"),
    send: t("help.chat.send"),
    transcript: t("help.chat.transcript"),
    email: t("help.chat.email"),
    end: t("help.chat.end"),
    sending: t("help.chat.sending"),
    restart: t("help.chat.restart"),
  }), [t]);

  // Hand the current state to the element.
  useEffect(() => {
    defineHelpChat();
    const el = ref.current;
    if (!el) return;
    const messages: ChatMessage[] = lines.map((l) => ({
      id: l.id,
      from: l.from,
      text: textOf(l),
      link: l.from === "bot" && l.link ? { href: l.link.href, label: t(l.link.label) } : undefined,
    }));
    el.view = {
      strings,
      messages,
      replies: phase === "ended" ? [] : offerable(topics).map((id) => ({ topic: id, label: t(TOPIC_LABEL[id]) })),
      typing,
      phase,
      error: error ? t(error.key) : "",
    };
  }, [lines, topics, typing, phase, error, strings, t, textOf]);

  // Events from the element.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onSend = (e: Event) => {
      const { text, topic } = (e as CustomEvent<ChatSendDetail>).detail;
      const id = conversation.current;
      add({ from: "user", text });
      setTyping(true);
      askAssistant(text, topic as TopicId | undefined).then(
        (answer) => {
          if (id !== conversation.current) return;
          add({ from: "bot", key: answer.reply, link: answer.link });
          setTopics(answer.next);
        },
        () => { if (id === conversation.current) add({ from: "bot", key: "help.bot.error" }); },
      ).finally(() => { if (id === conversation.current) setTyping(false); });
    };
    const onEnd = (e: Event) => {
      const { transcript, email } = (e as CustomEvent<ChatEndDetail>).detail;
      if (!transcript) {
        conversation.current++;
        setTyping(false);
        setError(null);
        add({ from: "system", key: "help.chat.ended" });
        setPhase("ended");
        return;
      }
      if (!email.trim()) return setError({ key: "help.chat.emailMissing" });
      if (!isEmail(email)) return setError({ key: "help.chat.emailInvalid" });
      setError(null);
      setPhase("sending");
      const copy = linesRef.current.filter((l) => l.from !== "system").map((l) => ({ from: l.from as "user" | "bot", text: textOf(l) }));
      sendTranscript(email, copy).then(
        ({ sentTo }) => {
          conversation.current++;
          setTyping(false);
          add({ from: "system", key: "help.chat.endedSent", vars: { email: sentTo } });
          setPhase("ended");
        },
        () => {
          setError({ key: "help.chat.sendFailed" });
          setPhase("open");
        },
      );
    };
    const onRestart = () => {
      conversation.current++;
      nextId.current = 1;
      setLines([GREETING]);
      setTopics(START_TOPICS);
      setTyping(false);
      setError(null);
      setPhase("open");
    };
    el.addEventListener("chat-send", onSend);
    el.addEventListener("chat-end", onEnd);
    el.addEventListener("chat-restart", onRestart);
    return () => {
      el.removeEventListener("chat-send", onSend);
      el.removeEventListener("chat-end", onEnd);
      el.removeEventListener("chat-restart", onRestart);
    };
  }, [add, textOf]);

  return <amc-help-chat id="help-chat" ref={ref} className={s.chat} />;
}
