/**
 * The schedule of fees and charges shown in the Help centre, built from the same data the services use
 * (birth certificate fees, trade licence categories, venue rates), so the table and the services agree.
 */
import { pick, type DictKey, type Lang } from "@/i18n";
import { formatINR } from "@/lib/format";
import { BIRTH_FEES, TRADE_FEES, TRADE_GROUPS } from "@/mock/endpoints/certificates";
import { VENUES } from "@/modules/bookings/booking";

type T = (k: DictKey, vars?: Record<string, string | number>) => string;

export interface FeeRow {
  service: string;
  fee: string;
  unit: string;
  note: string;
}

export interface FeeGroup {
  id: string;
  title: string;
  rows: FeeRow[];
}

/** The date the current schedule took effect (shown in the caption). */
export const FEES_EFFECTIVE = "2026-04-01";

export function tradeFeeRange(): { min: number; max: number } {
  const fees = TRADE_GROUPS.flatMap((g) => g.categories.map((c) => c.fee));
  return { min: Math.min(...fees), max: Math.max(...fees) };
}

export function feeSchedule(t: T, lang: Lang): FeeGroup[] {
  const trade = tradeFeeRange();
  const free = t("help.fee.free");
  return [
    {
      id: "certificates",
      title: t("help.fee.gCertificates"),
      rows: [
        { service: t("help.fee.birth"), fee: formatINR(BIRTH_FEES.perCopy), unit: t("help.fee.perCopy"), note: t("help.fee.birthNote") },
        { service: t("help.fee.speedPost"), fee: formatINR(BIRTH_FEES.speedPost), unit: t("help.fee.perApplication"), note: t("help.fee.speedPostNote") },
        {
          service: t("help.fee.trade"),
          fee: `${formatINR(trade.min)} – ${formatINR(trade.max)}`,
          unit: t("help.fee.perYear"),
          note: t("help.fee.tradeNote", { step: formatINR(TRADE_FEES.perStep), stepArea: TRADE_FEES.stepArea, freeArea: TRADE_FEES.freeArea }),
        },
      ],
    },
    {
      id: "venues",
      title: t("help.fee.gVenues"),
      rows: VENUES.map((v) => ({
        service: pick(v, lang),
        fee: formatINR(v.rate),
        unit: t("help.fee.perHour"),
        note: t("help.fee.venueNote", { deposit: formatINR(v.deposit) }),
      })),
    },
    {
      id: "online",
      title: t("help.fee.gOnline"),
      rows: [
        { service: t("help.fee.waterPay"), fee: free, unit: t("help.fee.perPayment"), note: t("help.fee.payNote") },
        { service: t("help.fee.taxPay"), fee: free, unit: t("help.fee.perPayment"), note: t("help.fee.payNote") },
        { service: t("help.fee.grievance"), fee: free, unit: t("help.fee.perComplaint"), note: t("help.fee.grievanceNote") },
        { service: t("help.fee.events"), fee: free, unit: t("help.fee.perPerson"), note: t("help.fee.eventsNote") },
      ],
    },
  ];
}
