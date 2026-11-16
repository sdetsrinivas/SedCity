"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { nextReference, saveApplication } from "@/lib/applications";
import { formatINR } from "@/lib/format";
import { createPaySession, getPaySession, type PaySession } from "@/mock/endpoints/astheenpay";
import { recordWaterPayment, type WaterBill } from "@/mock/endpoints/water";
import { PaymentOptions } from "./PaymentOptions";
import { GatewayFrame } from "./GatewayFrame";
import { Receipt } from "./Receipt";

type Step =
  | { step: "options"; notice?: string }
  | { step: "gateway"; session: string }
  | { step: "receipt"; receiptNo: string; pay: PaySession };

/** Payment options → AstheenPay (iframe or popup) → receipt, for an unpaid water bill. */
export function PaymentFlow({ bill }: { bill: WaterBill }) {
  const { t, lang } = useT();
  const [state, setState] = useState<Step>({ step: "options" });

  if (state.step === "options") {
    return (
      <PaymentOptions
        total={bill.charges.total}
        notice={state.notice}
        onProceed={(c) => {
          const session = createPaySession({ consumerNo: bill.consumerNo, billNo: bill.billNo, ...c });
          setState({ step: "gateway", session: session.id });
        }}
      />
    );
  }

  if (state.step === "gateway") {
    return (
      <GatewayFrame
        key={state.session}
        session={state.session}
        onResult={(status) => {
          const pay = getPaySession(state.session);
          if (status !== "paid" || !pay?.txnId) {
            setState({ step: "options", notice: t(status === "closed" ? "wt.windowClosed" : "wt.cancelled") });
            return;
          }
          const receiptNo = nextReference("water");
          recordWaterPayment(pay.billNo, pay.amount);
          saveApplication({
            ref: receiptNo,
            service: "water",
            title: t("wt.appTitle", { no: bill.consumerNo }),
            submittedAt: pay.paidAt!,
            status: "Paid",
            applicant: pick(bill.name, lang),
            amount: pay.amount + pay.fee,
            details: { consumerNo: bill.consumerNo, billNo: bill.billNo, txnId: pay.txnId, amount: formatINR(pay.amount), method: pay.method },
          });
          setState({ step: "receipt", receiptNo, pay });
        }}
      />
    );
  }

  return <Receipt receiptNo={state.receiptNo} pay={state.pay} billTotal={bill.charges.total} />;
}
