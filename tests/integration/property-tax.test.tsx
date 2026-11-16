import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { PropertyTax } from "@/modules/property-tax/PropertyTax";
import { LocalitySelect } from "@/modules/property-tax/LocalitySelect";
import { Checkout } from "@/modules/astheenpay/Checkout";
import { createPaySession } from "@/mock/endpoints/astheenpay";
import { checkAssessment, localityPage, recordTaxPayment } from "@/mock/endpoints/property";

describe("property tax mock endpoints", () => {
  it("pages the 48 localities ten at a time", () => {
    expect(localityPage(0).items).toHaveLength(10);
    expect(localityPage(0).items[0]).toMatchObject({ id: "W01", name: { en: "Periyar Colony" }, baseRate: 2.4 });
    expect(localityPage(4)).toMatchObject({ hasMore: false });
    expect(localityPage(4).items.at(-1)!.name.en).toBe("Pavala Nagar");
  });

  it("verifies an assessment and remembers a paid half-year", async () => {
    expect(await checkAssessment("999-999-99999", "2026-27/2")).toBeNull();
    const rec = await checkAssessment("014-002-00731", "2026-27/2");
    expect(rec).toMatchObject({ owner: { en: "Meena Rajendran" }, usage: "residential", paidReceipt: null });
    expect(rec!.address).toContain("Ilango Street");
    recordTaxPayment("014-002-00731", "2026-27/2", "AMC/PT/2026/004900");
    expect((await checkAssessment("014-002-00731", "2026-27/2"))!.paidReceipt).toBe("AMC/PT/2026/004900");
    expect((await checkAssessment("014-002-00731", "2027-28/1"))!.paidReceipt).toBeNull();
  });
});

describe("Property tax form", () => {
  it("loads more localities when the list is scrolled to its end", async () => {
    const onChange = vi.fn();
    renderWithProviders(<LocalitySelect value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Locality/ }));
    const list = await screen.findByRole("listbox", { name: "Locality" });
    await waitFor(() => expect(within(list).getAllByRole("option")).toHaveLength(10));
    fireEvent.scroll(list);
    await waitFor(() => expect(within(list).getAllByRole("option")).toHaveLength(20));
    fireEvent.click(within(list).getByRole("option", { name: "Kalaivani Nagar (Ward 14)" }));
    expect(onChange).toHaveBeenCalledWith("W14");
  });

  it("debounces verification, pre-fills the floors and lists what is missing", async () => {
    renderWithProviders(<PropertyTax />);
    fireEvent.change(screen.getByLabelText("Assessment number"), { target: { value: "01400200731" } });
    expect(screen.queryByText("Property found")).toBeNull();
    expect(await screen.findByText("Property found")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Residential" })).toBeChecked();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "First floor" })).toBeInTheDocument();
    expect(within(table).queryByRole("textbox")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Proceed to pay" })[0]);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Choose the locality.");
    expect(alert).toHaveTextContent("Choose how you want to pay.");
    expect(alert).not.toHaveTextContent("assessment number");

    const box = screen.getByRole("checkbox", { name: /senior citizen/ });
    fireEvent.keyDown(box, { key: " " });
    expect(box).toHaveAttribute("aria-checked", "true");
    await act(async () => {});
  });
});

describe("AstheenPay checkout for property tax", () => {
  it("words the order as property tax", async () => {
    const s = createPaySession({ order: { kind: "propertyTax", assessmentNo: "014-002-00731", half: 2, fy: "2026-27" }, amount: 2980, fee: 0, method: "upi", email: null });
    renderWithProviders(<Checkout sessionId={s.id} view="frame" />);
    expect(await screen.findByText("Property tax, second half 2026-27 (assessment 014-002-00731)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay ₹2,980.00" })).toBeInTheDocument();
  });
});
