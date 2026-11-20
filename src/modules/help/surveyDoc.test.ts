import { describe, expect, it } from "vitest";
import { escapeHtml, RATINGS, SURVEY_SERVICES, surveyDocument, surveyProblems, type SurveyWords } from "./surveyDoc";

const words: SurveyWords = {
  questionsTitle: "Survey questions", loading: "Loading the questions…", loadError: "Could not load", retry: "Try again",
  service: "Which service?", servicePick: "Select a service",
  services: Object.fromEntries(SURVEY_SERVICES.map((id) => [id, `S:${id}`])) as SurveyWords["services"],
  rating: "How satisfied?", ratings: Object.fromEntries(RATINGS.map((n) => [n, `R${n}`])) as SurveyWords["ratings"],
  comments: "Comments", commentsHint: "No phone numbers", submit: "Submit feedback", sending: "Sending…",
  needService: "Pick a service", needRating: "Pick a rating", sendError: "Not sent",
  thanksTitle: "Thank you", thanksRef: "Your reference number is {ref}.", thanksBody: "We read every response.",
};

describe("survey inner documents", () => {
  it("builds one complete document per view, in the page's language and theme", () => {
    const loading = surveyDocument({ kind: "loading" }, words, "ta", "dark");
    expect(loading).toMatch(/^<!doctype html><html lang="ta" data-theme="dark">/);
    expect(loading).toContain('data-view="loading"');
    expect(loading).toContain("Loading the questions…");
    expect(loading).not.toContain("<form");

    const form = surveyDocument({ kind: "form" }, words, "en", "light");
    expect(form).toContain('data-theme="light"');
    expect(form).toContain('<form id="survey" novalidate>');
    for (const id of SURVEY_SERVICES) expect(form).toContain(`<option value="${id}">S:${id}</option>`);
    expect(form.match(/type="radio" name="rating"/g)).toHaveLength(5);
    expect(form).toContain(">Submit feedback</button>");
    expect(form).not.toContain('role="alert">Not sent');

    expect(surveyDocument({ kind: "form", sending: true, failed: true }, words, "en", "x")).toMatch(/data-theme="light"[\s\S]*role="alert">Not sent[\s\S]*disabled>Sending…/);
    expect(surveyDocument({ kind: "error" }, words, "en", "light")).toContain('id="retry"');
  });

  it("puts the reference into the thank-you line and escapes text", () => {
    const thanks = surveyDocument({ kind: "thanks", ref: "AMC/FB/2026/000318" }, words, "en", "light");
    expect(thanks).toContain('Your reference number is <span class="ref">AMC/FB/2026/000318</span>.');
    expect(escapeHtml(`<b a="1">&'`)).toBe("&lt;b a=&quot;1&quot;&gt;&amp;&#39;");
    expect(surveyDocument({ kind: "loading" }, { ...words, loading: "<script>x</script>" }, "en", "light")).not.toContain("<script>");
  });

  it("needs a service and a rating; comments are optional", () => {
    expect(surveyProblems({ service: "", rating: null, comments: "" })).toEqual({ service: true, rating: true });
    expect(surveyProblems({ service: "water", rating: 6, comments: "" })).toEqual({ service: false, rating: true });
    expect(surveyProblems({ service: "x" as "water", rating: 3, comments: "" })).toEqual({ service: true, rating: false });
    expect(surveyProblems({ service: "trade", rating: 1, comments: "" })).toEqual({ service: false, rating: false });
  });
});
