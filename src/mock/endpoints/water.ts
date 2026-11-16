import water from "../data/water.json";
import { call } from "../api";
import { store } from "../store";
import { streetById, wardById } from "./geo";
import { addDays, todayISO } from "@/lib/format";
import { computeCharges, type Charges, type WaterCategory } from "@/modules/water/bill";

export interface WaterBill {
  consumerNo: string;
  name: { en: string; ta: string };
  category: WaterCategory;
  address: string;
  ward: { en: string; ta: string };
  meterNo: string;
  billNo: string;
  billDate: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  paid: boolean;
  charges: Charges;
}

type Consumer = (typeof water.consumers)[number];

export function buildBill(c: Consumer, today = todayISO()): WaterBill {
  const street = streetById(c.streetId)!;
  const ward = wardById(street.wardId)!;
  const category = c.category as WaterCategory;
  const dueDate = addDays(today, c.dueInDays);
  const billDate = addDays(dueDate, -21);
  const periodTo = addDays(billDate, -1);
  const consumption = c.currentReading - c.previousReading;
  const tariff = water.tariff[category];
  const charges = computeCharges(consumption, tariff, {
    seweragePercent: water.tariff.seweragePercent,
    latePercent: water.tariff.latePercent,
    arrears: c.arrears,
  });
  return {
    consumerNo: c.no,
    name: c.name,
    category,
    address: `${c.door}, ${street.name}, Astheenapuram ${street.pincode}`,
    ward: { en: ward.en, ta: ward.ta },
    meterNo: c.meterNo,
    billNo: `WB/${billDate.slice(0, 7).replace("-", "")}/${c.no.slice(-5)}`,
    billDate,
    periodFrom: addDays(periodTo, -29),
    periodTo,
    dueDate,
    previousReading: c.previousReading,
    currentReading: c.currentReading,
    consumption,
    paid: c.paid,
    charges,
  };
}

/** DYN-01: the bill details panel only appears once this resolves (CONSUMER_LOOKUP, 2s). Null = no such consumer. */
export const lookupConsumer = (consumerNo: string) =>
  call("CONSUMER_LOOKUP", () => {
    const c = water.consumers.find((x) => x.no === consumerNo);
    if (!c) return null;
    const bill = buildBill(c);
    // A bill paid in full on this browser shows as paid on the next lookup.
    if ((waterPayments()[bill.billNo] ?? 0) >= bill.charges.total) bill.paid = true;
    return bill;
  });

/** Amount paid so far against each bill number (this browser only). */
export const waterPayments = () => store.get<Record<string, number>>("waterPayments", {});

export function recordWaterPayment(billNo: string, amount: number): void {
  const paid = waterPayments();
  store.set("waterPayments", { ...paid, [billNo]: Math.round(((paid[billNo] ?? 0) + amount) * 100) / 100 });
}
