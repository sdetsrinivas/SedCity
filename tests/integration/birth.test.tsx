import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { BirthForm } from "@/modules/certificates/BirthForm";
import { listApplications } from "@/lib/applications";
import { listSms } from "@/lib/sms";
import { addDays, formatDate, todayISO } from "@/lib/format";

const pdf = (name = "discharge.pdf", size = 1000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

function fillValid(dob = addDays(todayISO(), -5)) {
  fireEvent.change(screen.getByLabelText("Child's name"), { target: { value: "Kavin Arul" } });
  fireEvent.click(screen.getByLabelText("Male"));
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: dob } });
  fireEvent.change(screen.getByLabelText("Hospital or place of birth"), { target: { value: "H02" } });
  fireEvent.change(screen.getByLabelText("Mother's name"), { target: { value: "Divya Arul" } });
  fireEvent.click(screen.getByLabelText("Mother or father"));
  fireEvent.change(screen.getByLabelText("Applicant's name"), { target: { value: "Arul Kumar" } });
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9840012345" } });
  fireEvent.change(screen.getByLabelText("Proof of birth"), { target: { files: [pdf()] } });
  fireEvent.click(screen.getByLabelText(/Speed Post/));
  fireEvent.change(screen.getByLabelText("Postal address"), { target: { value: "12, Thendral Street, Ward 14" } });
  fireEvent.change(screen.getByLabelText("PIN code"), { target: { value: "641014" } });
}

describe("Birth certificate application", () => {
  it("lists every problem with its limits filled in", async () => {
    renderWithProviders(<BirthForm />);
    fireEvent.change(screen.getByLabelText("Child's name"), { target: { value: "x".repeat(45) } });
    fireEvent.change(screen.getByLabelText("Number of copies"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1949-05-01" } });
    submit();
    const summary = await screen.findByText("Please correct the following:").then((el) => el.closest<HTMLElement>("[role=alert]")!);
    expect(summary).toHaveTextContent("The child's name can have at most 40 characters.");
    expect(summary).toHaveTextContent("Births before 01/01/1950 are registered at the Registrar's counter, not online.");
    expect(summary).toHaveTextContent("Enter between 1 and 5 copies.");
    expect(summary).toHaveTextContent("Attach the proof of birth.");
    expect(summary.textContent).not.toMatch(/\{\w+\}/);
    expect(listApplications()).toHaveLength(0);
  });

  it("keeps the two radio groups named 'type' in separate forms", () => {
    const { container } = renderWithProviders(<BirthForm />);
    const radios = container.querySelectorAll<HTMLInputElement>("input[type=radio][name=type]");
    expect(radios).toHaveLength(6);
    const forms = new Set([...radios].map((r) => r.form));
    expect(forms.size).toBe(2);
    fireEvent.click(screen.getByLabelText("Legal guardian"));
    fireEvent.click(screen.getByLabelText(/Collect from the zonal office/));
    expect(container.querySelectorAll("input[name=type]:checked")).toHaveLength(2);
    const twos = container.querySelectorAll("input[name=type][value='2']");
    expect(twos).toHaveLength(2);
    expect(twos[0].closest("label")).toHaveTextContent("Legal guardian");
  });

  it("rejects a proof file that is not a PDF or an image and clears it", () => {
    renderWithProviders(<BirthForm />);
    const input = screen.getByLabelText("Proof of birth") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByText("notes.txt: only PDF, JPG or PNG files can be attached.")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [pdf("scan.pdf", 3 * 1024 * 1024)] } });
    expect(screen.getByText("scan.pdf: the file is larger than 2 MB.")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [pdf()] } });
    expect(screen.getByText("Attached: discharge.pdf (1 KB)")).toBeInTheDocument();
  });

  it("saves the application, sends an SMS and shows the acknowledgement", async () => {
    renderWithProviders(<BirthForm />);
    const dob = addDays(todayISO(), -5);
    fillValid(dob);
    fireEvent.change(screen.getByLabelText("Number of copies"), { target: { value: "2" } });
    expect(screen.getByText("₹140.00")).toBeInTheDocument();
    submit();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Application submitted" })).toBeInTheDocument(), { timeout: 4000 });
    const ref = screen.getByText(/^AMC\/BC\/\d{4}\/\d{6}$/).textContent!;
    const done = screen.getByRole("heading", { name: "Application submitted" }).closest<HTMLElement>("[role=status]")!;
    expect(within(done).getByText(formatDate(dob))).toBeInTheDocument();
    expect(within(done).getByText("AMC Maternity Hospital, Kalaivani Nagar")).toBeInTheDocument();
    expect(within(done).getByText("Speed Post")).toBeInTheDocument();
    const [app] = listApplications();
    expect(app).toMatchObject({ ref, service: "birth", status: "Submitted", amount: 140, details: { hospital: "H02", dob, delivery: "2", copies: "2", proof: "discharge.pdf" } });
    expect(listSms()[0].body).toContain(ref);
  });
});
