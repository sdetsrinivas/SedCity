"use client";
import { useT } from "@/i18n/client";
import s from "./Survey.module.css";

export const SURVEY_URL = "/forms/feedback";

/**
 * FRM-02: the survey is a same-origin <iframe> (/forms/feedback) whose document holds a second <iframe>
 * with the questions (FRM-03, srcdoc). Nothing of the survey belongs to this page's document. The outer
 * document sets this frame's height to its content. Re-created when the language changes (its text comes
 * from the server); the theme is followed in place by the frame itself.
 */
export function SurveyFrame() {
  const { t, lang } = useT();
  return <iframe key={lang} src={SURVEY_URL} title={t("survey.frameTitle")} className={s.outer} />;
}
