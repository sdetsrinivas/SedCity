import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { HelpTabs } from "@/modules/help/HelpTabs";
import { FaqAccordion } from "@/modules/help/FaqAccordion";
import { faqGroups } from "@/modules/help/faq";
import { HelpChat } from "@/modules/help/HelpChat";
import { dictionaries, translate, type DictKey } from "@/i18n";

const t = (k: DictKey) => translate(dictionaries.en, k);

describe("Help centre tabs and FAQ", () => {
  it("switches panels with clicks and arrow keys; one FAQ answer open at a time", () => {
    renderWithProviders(
      <HelpTabs label="Help topics" initial="faq" tabs={[{ id: "faq", label: "Questions" }, { id: "fees", label: "Fees" }]}>
        <FaqAccordion groups={faqGroups(t)} />
        <p>Fee table</p>
      </HelpTabs>,
    );
    const [faq, fees] = screen.getAllByRole("tab");
    expect(faq).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Fee table")).not.toBeVisible();
    fireEvent.click(fees!);
    expect(fees).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Fee table")).toBeVisible();
    expect(window.location.search).toBe("?tab=fees");
    fireEvent.keyDown(fees!, { key: "ArrowRight" });
    expect(faq).toHaveAttribute("aria-selected", "true");
    expect(faq).toHaveFocus();
    expect(window.location.search).toBe("");

    const q1 = screen.getByRole("button", { name: "Can I pay only part of my water bill?" });
    const q2 = screen.getByRole("button", { name: "How do I check the status of my grievance?" });
    expect(screen.getByText(/amount slider/)).not.toBeVisible();
    fireEvent.click(q1);
    expect(screen.getByText(/amount slider/)).toBeVisible();
    fireEvent.click(q2);
    expect(q1).toHaveAttribute("aria-expanded", "false");
    expect(q2).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/amount slider/)).not.toBeVisible();
  });
});

describe("Chat with us (<amc-help-chat>)", () => {
  const root = () => document.querySelector("amc-help-chat")!.shadowRoot!;
  const items = () => [...root().querySelectorAll(".log li")].map((li) => li.textContent);

  it("answers typed questions and quick replies, and ends with a transcript", async () => {
    renderWithProviders(<HelpChat />);
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(document.getElementById("chat-input")).toBeNull();
    const input = root().querySelector<HTMLInputElement>("#chat-input")!;
    const send = root().querySelector<HTMLButtonElement>(".send")!;
    expect(send.disabled).toBe(true);
    input.value = "water";
    expect(send.disabled).toBe(true); // no input event
    fireEvent.input(input, { target: { value: "How do I pay my water bill?" } });
    expect(send.disabled).toBe(false);
    await act(async () => { fireEvent.submit(root().querySelector("form")!); });
    await waitFor(() => expect(items()).toHaveLength(3));
    expect(items()[1]).toBe("You: How do I pay my water bill?");
    expect(items()[2]).toContain("consumer number");

    const chips = () => [...root().querySelector("amc-quick-replies")!.shadowRoot!.querySelectorAll("amc-reply-chip")];
    expect(chips().map((c) => c.getAttribute("label"))).toEqual(["Fees and charges", "Report a problem", "Office timings"]);
    await act(async () => { chips()[2]!.shadowRoot!.querySelector("button")!.click(); });
    await waitFor(() => expect(items()).toHaveLength(5));
    expect(items()[4]).toContain("Citizen Service Centres are open every day");

    const box = root().querySelector<HTMLInputElement>("#chat-transcript")!;
    fireEvent.click(box);
    expect(root().querySelector<HTMLElement>(".email")!.hidden).toBe(false);
    fireEvent.input(root().querySelector("#chat-email")!, { target: { value: "meena.r@example.com" } });
    await act(async () => { root().querySelector<HTMLButtonElement>(".end-chat")!.click(); });
    await waitFor(() => expect(items().at(-1)).toBe("Chat ended. A copy of this conversation has been sent to meena.r@example.com."));
    expect(root().querySelector<HTMLElement>(".open-only")!.hidden).toBe(true);
  });

  it("speaks Tamil on the Tamil page", async () => {
    renderWithProviders(<HelpChat />, "ta");
    await waitFor(() => expect(items()[0]).toContain("வணக்கம்"));
    expect(root().querySelector("#chat-title")!.textContent).toBe("உதவி – மாநகராட்சி உதவியாளர்");
  });
});

describe("Satisfaction survey", () => {
  it("reads the questions form and stores a response with a feedback reference", async () => {
    const { surveyDocument, readSurveyForm, RATINGS, SURVEY_SERVICES } = await import("@/modules/help/surveyDoc");
    const { submitSurvey } = await import("@/mock/endpoints/help");
    const words = Object.fromEntries(["questionsTitle", "loading", "loadError", "retry", "service", "servicePick", "rating", "comments", "commentsHint", "submit", "sending", "needService", "needRating", "sendError", "thanksTitle", "thanksRef", "thanksBody"].map((k) => [k, k]));
    const html = surveyDocument(
      { kind: "form" },
      { ...words, services: Object.fromEntries(SURVEY_SERVICES.map((id) => [id, id])), ratings: Object.fromEntries(RATINGS.map((n) => [n, String(n)])) } as never,
      "en",
      "light",
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = doc.getElementById("survey") as HTMLFormElement;
    expect(readSurveyForm(form)).toEqual({ service: "", rating: null, comments: "" });
    (doc.getElementById("service") as HTMLSelectElement).value = "booking";
    (doc.querySelector("input[name=rating][value='4']") as HTMLInputElement).checked = true;
    (doc.getElementById("comments") as HTMLTextAreaElement).value = "  More evening slots  ";
    const answer = readSurveyForm(form);
    expect(answer).toEqual({ service: "booking", rating: 4, comments: "  More evening slots  " });

    localStorage.clear();
    const overrides = { scale: 0 };
    document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify(overrides))}; path=/`;
    const first = await submitSurvey({ service: "booking", rating: 4, comments: answer.comments, lang: "en" });
    const second = await submitSurvey({ service: "water", rating: 2, comments: "", lang: "ta" });
    document.cookie = "amc_mock=; max-age=0; path=/";
    expect(first.ref).toMatch(/^AMC\/FB\/\d{4}\/\d{6}$/);
    expect(Number(second.ref.slice(-6))).toBe(Number(first.ref.slice(-6)) + 1);
    const stored = JSON.parse(localStorage.getItem("amc.surveyResponses")!);
    expect(stored.map((r: { ref: string }) => r.ref)).toEqual([second.ref, first.ref]);
    expect(stored[1]).toMatchObject({ service: "booking", rating: 4, comments: "More evening slots", lang: "en" });
  });
});
