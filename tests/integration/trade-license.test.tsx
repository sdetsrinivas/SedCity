import { beforeAll, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { TradeForm } from "@/modules/certificates/TradeForm";
import { listApplications } from "@/lib/applications";
import { listSms } from "@/lib/sms";

const pdf = (name: string, size = 1000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

beforeAll(() => {
  // jsdom has no layout, pointer capture or canvas encoding.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.setPointerCapture ??= () => {};
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
});

/** A pointer stroke on the signature pad, `steps` × 10px long. */
function sign(steps = 10) {
  const pad = screen.getByRole("img", { name: "Signature of the owner" });
  const at = (i: number) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: 10 + i * 10, clientY: 40 });
  fireEvent.pointerDown(pad, at(0));
  for (let i = 1; i <= steps; i++) fireEvent.pointerMove(pad, at(i));
  fireEvent.pointerUp(pad, at(steps));
}

function fillValid(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText("Name of the business"), { target: { value: "Sri Murugan Sweets" } });
  fireEvent.change(screen.getByLabelText("Business category"), { target: { value: "FH02" } });
  fireEvent.change(screen.getByLabelText("Floor area (sq. ft)"), { target: { value: "450" } });
  const [premLine, resLine] = container.querySelectorAll("[id=addr-line]");
  const [premPin, resPin] = container.querySelectorAll("[id=addr-pin]");
  fireEvent.change(premLine, { target: { value: "14, Thendral Street, Kalaivani Nagar" } });
  fireEvent.change(premPin, { target: { value: "641014" } });
  fireEvent.change(screen.getByLabelText("Ward"), { target: { value: "W14" } });
  fireEvent.click(screen.getByLabelText("Rented"));
  fireEvent.change(screen.getByLabelText("Owner's name"), { target: { value: "Murugan Selvam" } });
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9840012345" } });
  fireEvent.change(resLine, { target: { value: "7, Lake Road, Pavala Nagar" } });
  fireEvent.change(resPin, { target: { value: "641022" } });
  fireEvent.change(screen.getByLabelText("Supporting documents"), { target: { files: [pdf("aadhaar.pdf"), pdf("lease.pdf")] } });
  fireEvent.change(screen.getByLabelText("Account holder's name"), { target: { value: "Murugan Selvam" } });
  fireEvent.change(screen.getByLabelText("Bank account number"), { target: { value: "123456789012" } });
  fireEvent.change(screen.getByLabelText("Re-enter bank account number"), { target: { value: "123456789012" } });
  fireEvent.change(screen.getByLabelText("IFSC code"), { target: { value: "astb0001234" } });
  sign();
  fireEvent.click(screen.getByLabelText(/I declare that the information given is true/));
}

describe("Trade licence application", () => {
  it("lists every problem with its limits filled in", async () => {
    renderWithProviders(<TradeForm />);
    fireEvent.change(screen.getByLabelText("Floor area (sq. ft)"), { target: { value: "5" } });
    submit();
    const summary = await screen.findByText("Please correct the following:").then((el) => el.closest<HTMLElement>("[role=alert]")!);
    expect(summary).toHaveTextContent("Enter the floor area in whole square feet, between 20 and 20000.");
    expect(summary).toHaveTextContent("Attach at least 2 supporting documents.");
    expect(summary).toHaveTextContent("Sign in the signature box.");
    expect(summary).toHaveTextContent("Enter the owner's full residential address.");
    expect(summary.textContent).not.toMatch(/\{\w+\}/);
    expect(screen.getByText(/At least 2 and at most 5 files\./)).toBeInTheDocument();
    expect(listApplications()).toHaveLength(0);
  });

  it("refuses a document selection with an unusable file and names it", () => {
    renderWithProviders(<TradeForm />);
    const input = screen.getByLabelText("Supporting documents") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pdf("a.pdf"), new File(["x"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByText("notes.txt: only PDF, JPG or PNG files can be attached.")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: Array.from({ length: 6 }, (_, i) => pdf(`${i}.pdf`)) } });
    expect(screen.getByText("You can attach at most 5 files.")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [pdf("a.pdf"), pdf("b.pdf")] } });
    expect(screen.getByText("Attached files (2)")).toBeInTheDocument();
  });

  it("blocks pasting into the re-entered account number only", () => {
    renderWithProviders(<TradeForm />);
    const again = screen.getByLabelText("Re-enter bank account number");
    expect(fireEvent.paste(again)).toBe(false);
    expect(fireEvent.paste(screen.getByLabelText("Bank account number"))).toBe(true);
  });

  it("repeats the address ids, so the second block's fields have no label", () => {
    const { container } = renderWithProviders(<TradeForm />);
    expect(container.querySelectorAll("[id=addr-pin]")).toHaveLength(2);
    expect(screen.getAllByLabelText("PIN code")).toHaveLength(1);
    const residence = screen.getByRole("group", { name: "Owner's residential address" });
    expect(within(residence).queryByLabelText("PIN code")).toBeNull();
  });

  it("enables Clear only after a pointer stroke on the signature pad", () => {
    renderWithProviders(<TradeForm />);
    const clear = screen.getByRole("button", { name: "Clear signature" });
    expect(clear).toBeDisabled();
    sign();
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(clear).toBeDisabled();
  });

  it("saves the application, sends an SMS and shows the acknowledgement", async () => {
    const { container } = renderWithProviders(<TradeForm />);
    fillValid(container);
    submit();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Application submitted" })).toBeInTheDocument(), { timeout: 4000 });
    const ref = screen.getByText(/^AMC\/TL\/\d{4}\/\d{6}$/).textContent!;
    const done = screen.getByRole("heading", { name: "Application submitted" }).closest<HTMLElement>("[role=status]")!;
    expect(within(done).getByText("Bakery and sweet stall")).toBeInTheDocument();
    expect(within(done).getByText("₹1,800.00")).toBeInTheDocument();
    expect(within(done).getByText("XXXXXXXX9012")).toBeInTheDocument();
    const [app] = listApplications();
    expect(app).toMatchObject({
      ref, service: "trade", amount: 1800,
      details: { ifsc: "ASTB0001234", ward: "W14", premises: "14, Thendral Street, Kalaivani Nagar 641014", residence: "7, Lake Road, Pavala Nagar 641022", documents: "aadhaar.pdf, lease.pdf" },
    });
    expect(listSms()[0].body).toContain(ref);
  });

  it("renders in Tamil with the category groups translated", () => {
    renderWithProviders(<TradeForm />, "ta");
    const select = screen.getByLabelText("வணிக வகை") as HTMLSelectElement;
    expect([...select.querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["உணவு மற்றும் விருந்தோம்பல்", "சில்லறை வணிகம்", "சேவைகள்", "உற்பத்தி மற்றும் சேமிப்பு"]);
  });
});
