import { call } from "../api";
import { store } from "../store";
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

/** One answer to the citizen satisfaction survey (/help/survey), kept in this browser. */
export interface SurveyResponse {
  ref: string;
  service: string;
  rating: number;
  comments: string;
  lang: string;
  submittedAt: string;
}

/** The survey questions become available (SURVEY_INNER, 2s): the inner frame then shows the form. */
export const loadSurveyQuestions = () => call("SURVEY_INNER", () => true);

/** Feedback references look like AMC/FB/2026/000318 — a counter kept in localStorage. */
function nextFeedbackRef(now: Date): string {
  const next = store.get<number>("feedbackCounter", 300 + Math.floor(Math.random() * 100)) + 1;
  store.set("feedbackCounter", next);
  return `AMC/FB/${now.getFullYear()}/${String(next).padStart(6, "0")}`;
}

/** Stores a survey response in this browser (`amc.surveyResponses`) and returns it with its reference (SURVEY_SUBMIT). */
export const submitSurvey = (answer: Omit<SurveyResponse, "ref" | "submittedAt">) =>
  call("SURVEY_SUBMIT", () => {
    const now = new Date();
    const saved: SurveyResponse = { ...answer, comments: answer.comments.trim(), ref: nextFeedbackRef(now), submittedAt: now.toISOString() };
    store.set("surveyResponses", [saved, ...store.get<SurveyResponse[]>("surveyResponses", [])]);
    return saved;
  });
