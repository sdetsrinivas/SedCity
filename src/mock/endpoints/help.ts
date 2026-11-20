import { call } from "../api";
import { matchTopic, topicById, type Topic, type TopicId } from "@/modules/help/chatBot";

/**
 * The help-desk assistant answers a question (CHAT_REPLY, random 1–2s). A quick reply names its topic;
 * typed text is matched against the topics' words.
 */
export const askAssistant = (question: string, topic?: TopicId): Promise<Topic> =>
  call("CHAT_REPLY", () => (topic ? topicById(topic) : matchTopic(question)));

export interface TranscriptLine {
  from: "user" | "bot";
  text: string;
}

/** Sends a copy of the conversation to the given address (CHAT_TRANSCRIPT). */
export const sendTranscript = (email: string, lines: TranscriptLine[]) =>
  call("CHAT_TRANSCRIPT", () => ({ sentTo: email.trim(), lines: lines.length }));
