import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { isEmail, matchTopic, offerable, START_TOPICS, TOPIC_LABEL, TOPICS, topicById } from "./chatBot";

describe("help-desk assistant topics", () => {
  it.each([
    ["How do I pay my water bill?", "water"],
    ["my electricity bill is wrong", "electricity"],
    ["Property tax bill", "tax"],
    ["I need a birth certificate for my son", "birth"],
    ["trade licence certificate renewal", "trade"],
    ["Garbage not collected in my street", "grievance"],
    ["Can I book the community hall for a function?", "booking"],
    ["What are the fees?", "fees"],
    ["when is the ward office open", "offices"],
    ["Thanks a lot", "thanks"],
    ["hi", "greet"],
    ["Vanakkam", "greet"],
    ["குடிநீர் கட்டணம்", "water"],
    ["சொத்து வரி எவ்வளவு?", "tax"],
    ["பிறப்புச் சான்றிதழ் வேண்டும்", "birth"],
    ["மின் இணைப்பு", "electricity"],
    ["நன்றி", "thanks"],
  ])("%s → %s", (q, topic) => {
    expect(matchTopic(q).id).toBe(topic);
  });

  it("whole-word and word-start rules avoid accidental matches", () => {
    expect(matchTopic("history of the city").id).toBe("fallback"); // "hi" only as a whole word
    expect(matchTopic("this is it").id).toBe("fallback");
    expect(matchTopic("bookshelf").id).toBe("booking"); // a word start is enough for stems
    expect(matchTopic("xyz").id).toBe("fallback");
    expect(matchTopic("   ").id).toBe("fallback");
  });

  it("every topic has a reply and link in the dictionary and offers labelled quick replies", () => {
    for (const t of TOPICS) {
      expect(en[t.reply], t.id).toBeTruthy();
      if (t.link) expect(en[t.link.label], t.id).toBeTruthy();
      expect(offerable(t.next).length, t.id).toBe(t.next.length);
    }
    for (const k of Object.values(TOPIC_LABEL)) expect(en[k]).toBeTruthy();
    expect(offerable(START_TOPICS)).toHaveLength(6);
    expect(topicById("fallback").reply).toBe("help.bot.fallback");
  });

  it("checks transcript addresses", () => {
    expect(isEmail("meena.r@example.com")).toBe(true);
    expect(isEmail("  a@b.in ")).toBe(true);
    expect(isEmail("meena.r@example")).toBe(false);
    expect(isEmail("meena r@example.com")).toBe(false);
    expect(isEmail("")).toBe(false);
  });
});
