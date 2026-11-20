import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SurveyForm } from "@/modules/help/SurveyForm";

export const metadata: Metadata = { title: { absolute: "Citizen satisfaction survey" }, robots: { index: false } };

/** The survey document shown inside the survey frame of /help/survey (FRM-02). */
export default async function FeedbackFormPage() {
  const theme = (await cookies()).get("amc_theme")?.value === "dark" ? "dark" : "light";
  return <SurveyForm initialTheme={theme} />;
}
