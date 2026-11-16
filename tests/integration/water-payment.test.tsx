import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { PaymentOptions } from "@/modules/water/PaymentOptions";
import { Checkout } from "@/modules/astheenpay/Checkout";
import { createPaySession, getPaySession } from "@/mock/endpoints/astheenpay";
import { listSms } from "@/lib/sms";

describe("Water bill payment options", () => {
  it("validates, moves the slider and method cards by keyboard, and hands over the choice", async () => {
    const onProceed = vi.fn();
    renderWithProviders(<PaymentOptions total={332.5} onProceed={onProceed} />);
    expect(screen.getByText("Checking for pending transactions on this connection…")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());

    const slider = screen.getByRole("slider", { name: "Amount to pay" });
    expect(slider).toHaveAttribute("aria-valuenow", "332.5");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(slider).toHaveAttribute("aria-valuenow", "230");
    expect(screen.getByText(/Balance carried forward/)).toHaveTextContent("₹102.50");

    fireEvent.click(screen.getByRole("button", { name: "Proceed to pay" }));
    expect(screen.getByText("Choose a payment method.")).toBeInTheDocument();
    expect(onProceed).not.toHaveBeenCalled();

    const group = screen.getByRole("radiogroup", { name: "Payment method" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());

    fireEvent.click(screen.getByLabelText("Email me the payment receipt"));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Proceed to pay" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "meena@example.in" } });
    fireEvent.click(screen.getByRole("button", { name: "Proceed to pay" }));
    expect(onProceed).toHaveBeenCalledWith({ amount: 230, method: "upi", fee: 0, email: "meena@example.in" });
  });

  it("ticks the email box via the property only for a signed-in resident", async () => {
    localStorage.setItem("amc.session", JSON.stringify({ username: "meena.r", email: "meena.r@example.in", mobile: "9840012345" }));
    renderWithProviders(<PaymentOptions total={150} onProceed={() => {}} />);
    const box = screen.getByLabelText("Email me the payment receipt") as HTMLInputElement;
    await waitFor(() => expect(box.checked).toBe(true));
    expect(box.hasAttribute("checked")).toBe(false);
    expect(screen.getByLabelText("Email address")).toHaveValue("meena.r@example.in");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText("Bills below ₹200 must be paid in full.")).toBeInTheDocument();
  });
});

describe("AstheenPay checkout", () => {
  const session = () =>
    createPaySession({ order: { kind: "water", consumerNo: "W02-014-00731", billNo: "WB/202611/00731" }, amount: 332.5, fee: 3.33, method: "card", email: null });

  it("validates card fields, asks for the OTP sent by SMS and marks the session paid", async () => {
    const s = session();
    renderWithProviders(<Checkout sessionId={s.id} view="frame" />);
    const pay = await screen.findByRole("button", { name: "Pay ₹335.83" });
    fireEvent.click(pay);
    expect(screen.getByText("Enter a valid card number.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Card number"), { target: { value: "4111111111111111" } });
    expect(screen.getByLabelText("Card number")).toHaveValue("4111 1111 1111 1111");
    fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: "MEENA R" } });
    fireEvent.change(screen.getByLabelText("Expiry (MM/YY)"), { target: { value: "1230" } });
    fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
    fireEvent.click(pay);

    const dialog = await screen.findByRole("dialog", { name: "Enter OTP" });
    const otp = /(\d{6}) is your AstheenPay OTP/.exec(listSms()[0].body)![1];
    fireEvent.change(within(dialog).getByLabelText("One-time password"), { target: { value: otp === "000000" ? "111111" : "000000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Verify and pay" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The OTP is incorrect");

    fireEvent.change(within(dialog).getByLabelText("One-time password"), { target: { value: otp } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Verify and pay" }));
    expect(await screen.findByText("Payment successful")).toBeInTheDocument();
    expect(getPaySession(s.id)).toMatchObject({ status: "paid", instrument: "•••• 1111" });
    expect(getPaySession(s.id)!.txnId).toMatch(/^APY\d{12}$/);
  });

  it("rejects an unknown session and cancels a pending one", async () => {
    renderWithProviders(<Checkout sessionId="aps_nope" view="frame" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("expired or is not valid");
    const s = session();
    renderWithProviders(<Checkout sessionId={s.id} view="frame" />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel payment" }));
    expect(getPaySession(s.id)!.status).toBe("cancelled");
  });
});
