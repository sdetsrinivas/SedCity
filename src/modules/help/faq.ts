import type { DictKey } from "@/i18n";
import type { FaqGroup } from "./FaqAccordion";

type T = (k: DictKey) => string;

/** Questions per group; the texts are `help.faq.<id>.q` / `.a`. */
export const FAQ: { id: string; title: DictKey; items: string[] }[] = [
  { id: "payments", title: "help.faq.gPayments", items: ["receipt", "failed", "partial"] },
  { id: "certificates", title: "help.faq.gCertificates", items: ["birthTime", "tradeRenew"] },
  { id: "grievances", title: "help.faq.gGrievances", items: ["track", "time"] },
  { id: "account", title: "help.faq.gAccount", items: ["otp", "language"] },
];

export const faqGroups = (t: T): FaqGroup[] =>
  FAQ.map((g) => ({
    id: g.id,
    title: t(g.title),
    items: g.items.map((id) => ({
      id,
      question: t(`help.faq.${id}.q` as DictKey),
      answer: t(`help.faq.${id}.a` as DictKey),
    })),
  }));
