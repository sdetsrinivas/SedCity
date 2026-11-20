/**
 * The help-desk assistant's (rule-based) knowledge: each topic has words that point to it (English and
 * Tamil), a reply, an optional link to the online service and the topics offered next as quick replies.
 * Pure: no DOM, no delays (the reply delay is CHAT_REPLY in src/mock/endpoints/help.ts).
 */
import type { DictKey } from "@/i18n";

export type TopicId =
  | "water" | "tax" | "birth" | "trade" | "grievance" | "booking" | "offices" | "fees" | "electricity"
  | "greet" | "thanks" | "fallback";

export interface Topic {
  id: TopicId;
  /** Lower-case words or word starts that select the topic (first match in TOPICS order wins; see `mentions`). */
  words: string[];
  reply: DictKey;
  link?: { href: string; label: DictKey };
  /** Quick replies offered after this reply. */
  next: TopicId[];
}

/** The quick replies shown when the chat opens and after small talk. */
export const START_TOPICS: TopicId[] = ["water", "grievance", "birth", "booking", "fees", "offices"];

export const TOPICS: Topic[] = [
  { id: "tax", words: ["property", "tax", "assessment", "சொத்து", "வரி"], reply: "help.bot.tax", link: { href: "/services/property-tax/assess", label: "help.bot.taxLink" }, next: ["water", "fees", "offices"] },
  { id: "electricity", words: ["electric", "power", "மின்"], reply: "help.bot.electricity", link: { href: "/services/electricity/new-connection", label: "help.bot.electricityLink" }, next: ["water", "offices", "fees"] },
  { id: "water", words: ["water", "consumer", "bill", "குடிநீர்", "தண்ணீர்"], reply: "help.bot.water", link: { href: "/services/water/pay", label: "help.bot.waterLink" }, next: ["fees", "grievance", "offices"] },
  { id: "trade", words: ["trade", "licence", "license", "shop", "business", "வணிக", "உரிமம்", "கடை"], reply: "help.bot.trade", link: { href: "/certificates/trade-license", label: "help.bot.tradeLink" }, next: ["fees", "birth", "offices"] },
  { id: "birth", words: ["birth", "certificate", "பிறப்பு", "சான்றிதழ்"], reply: "help.bot.birth", link: { href: "/certificates/birth", label: "help.bot.birthLink" }, next: ["fees", "trade", "offices"] },
  { id: "grievance", words: ["grievance", "complaint", "complain", "garbage", "streetlight", "pothole", "drain", "புகார்", "குறை"], reply: "help.bot.grievance", link: { href: "/grievances/new", label: "help.bot.grievanceLink" }, next: ["offices", "water", "booking"] },
  { id: "booking", words: ["book", "hall", "park", "venue", "marriage", "function", "மண்டப", "கூடம்", "பூங்கா", "முன்பதிவு"], reply: "help.bot.booking", link: { href: "/bookings", label: "help.bot.bookingLink" }, next: ["fees", "offices", "grievance"] },
  { id: "fees", words: ["fee", "fees", "charge", "cost", "price", "how much", "கட்டண", "செலவு"], reply: "help.bot.fees", link: { href: "/help?tab=fees", label: "help.bot.feesLink" }, next: ["birth", "booking", "trade"] },
  { id: "offices", words: ["office", "centre", "center", "address", "timing", "hours", "open", "near", "அலுவலக", "மையம்", "நேரம்"], reply: "help.bot.offices", link: { href: "/directory/offices", label: "help.bot.officesLink" }, next: ["water", "grievance", "fees"] },
  { id: "thanks", words: ["thank", "thanks", "நன்றி"], reply: "help.bot.thanks", next: START_TOPICS },
  { id: "greet", words: ["hello", "hi$", "hey$", "vanakkam", "good morning", "good evening", "வணக்கம்"], reply: "help.bot.greet", next: START_TOPICS },
];

const FALLBACK: Topic = { id: "fallback", words: [], reply: "help.bot.fallback", next: START_TOPICS };

/** Quick-reply label for each topic that can be offered. */
export const TOPIC_LABEL: Record<Exclude<TopicId, "greet" | "thanks" | "fallback">, DictKey> = {
  water: "help.qr.water",
  tax: "help.qr.tax",
  birth: "help.qr.birth",
  trade: "help.qr.trade",
  grievance: "help.qr.grievance",
  booking: "help.qr.booking",
  offices: "help.qr.offices",
  fees: "help.qr.fees",
  electricity: "help.qr.electricity",
};

export const topicById = (id: TopicId): Topic => TOPICS.find((t) => t.id === id) ?? FALLBACK;

/**
 * True when `word` occurs in `text`: Latin words at the start of a word (so "electric" finds
 * "electricity"; a trailing `$` asks for the whole word), Tamil anywhere (it joins suffixes to words).
 */
function mentions(text: string, word: string): boolean {
  const whole = word.endsWith("$");
  const w = whole ? word.slice(0, -1) : word;
  if (/^[a-z ]+$/.test(w)) return new RegExp(`(^|[^a-z])${w}${whole ? "($|[^a-z])" : ""}`).test(text);
  return text.includes(w);
}

/** The topic a typed question is about (the fallback when nothing matches). */
export function matchTopic(question: string): Topic {
  const text = question.toLowerCase().normalize("NFC").trim();
  if (!text) return FALLBACK;
  return TOPICS.find((t) => t.words.some((w) => mentions(text, w))) ?? FALLBACK;
}

/** Topics that can be offered as quick replies (small talk and the fallback have no label). */
export const offerable = (ids: TopicId[]) => ids.filter((id): id is keyof typeof TOPIC_LABEL => id in TOPIC_LABEL);

/** A transcript email address: one @, a dot in the domain, no spaces. */
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
