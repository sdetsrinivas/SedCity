import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { GrievanceForm } from "@/modules/grievance/GrievanceForm";
import { listApplications } from "@/lib/applications";
import { listSms } from "@/lib/sms";

const jpg = (name: string, size = 1000) => new File([new Uint8Array(size)], name, { type: "image/jpeg" });

function describeProblem(text: string) {
  const box = screen.getByRole("textbox", { name: "Describe the problem" });
  box.textContent = text;
  fireEvent.input(box);
}

describe("Grievance registration", () => {
  it("alerts when no ward is selected and lists the other missing fields", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container } = renderWithProviders(<GrievanceForm />);
    fireEvent.click(screen.getByRole("button", { name: "Submit grievance" }));
    expect(alert).toHaveBeenCalledWith("Please select your ward on the map before submitting the grievance.");
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Select the category of the problem.");
    expect(summary).toHaveTextContent("Choose a preferred time for the site inspection.");
    expect(container.querySelector("input[type=file]")).toBeNull();
    alert.mockRestore();
  });

  it("fills in the limits in the error summary", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderWithProviders(<GrievanceForm />);
    describeProblem("Too short");
    fireEvent.click(screen.getByRole("button", { name: "Submit grievance" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Describe the problem in at least 30 characters.");
    expect(summary.textContent).not.toMatch(/\{\w+\}/);
    alert.mockRestore();
  });

  it("focuses the category list the first time it opens", () => {
    renderWithProviders(<GrievanceForm />);
    fireEvent.click(screen.getByRole("button", { name: /Category/ }));
    const list = screen.getByRole("listbox", { name: "Category" });
    expect(document.activeElement).toBe(list);
    fireEvent.keyDown(list, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Category/ }));
  });

  it("opens the category list at the end of the body, outside the form", () => {
    const { container } = renderWithProviders(<GrievanceForm />);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Category/ }));
    const list = screen.getByRole("listbox", { name: "Category" });
    expect(container.contains(list)).toBe(false);
    expect(document.body.lastElementChild).toBe(list);
    fireEvent.click(within(list).getByRole("option", { name: "Street light not working" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: /Category/ })).toHaveTextContent("Street light not working");
  });

  it("only takes the description from input events on the editable area", () => {
    renderWithProviders(<GrievanceForm />);
    const box = screen.getByRole("textbox", { name: "Describe the problem" });
    expect(box.tagName).toBe("DIV");
    box.textContent = "Set from script without an input event";
    expect(screen.getByText("0 / 1000 characters")).toBeInTheDocument();
    fireEvent.input(box);
    expect(screen.getByText("38 / 1000 characters")).toBeInTheDocument();
  });

  it("rejects dropped files that are not photos and caps them at three", () => {
    renderWithProviders(<GrievanceForm />);
    const zone = screen.getByRole("group", { name: "Photos (optional)" });
    const pdf = new File(["%PDF"], "notice.pdf", { type: "application/pdf" });
    fireEvent.drop(zone, { dataTransfer: { files: [jpg("a.jpg"), pdf, jpg("b.jpg"), jpg("c.jpg"), jpg("d.jpg")] } });
    expect(screen.getByRole("list", { name: "3 photo(s) attached" }).children).toHaveLength(3);
    expect(screen.getByText("notice.pdf: only JPG and PNG photos can be attached.")).toBeInTheDocument();
    expect(screen.getByText("d.jpg: you can attach at most 3 photos.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo b.jpg" }));
    expect(screen.getByRole("list", { name: "2 photo(s) attached" })).toBeInTheDocument();
  });

  it("registers a complete grievance and shows the grievance number", async () => {
    renderWithProviders(<GrievanceForm />);
    fireEvent.click(screen.getByRole("button", { name: /Category/ }));
    fireEvent.click(screen.getByRole("option", { name: "Roads and potholes" }));
    fireEvent.click(screen.getByRole("button", { name: "Ward 14 – Kalaivani Nagar" }));
    expect(document.getElementById("gr-ward-selected")).toHaveTextContent("Ward 14 – Kalaivani Nagar");
    describeProblem("Large pothole in front of house no. 12, near the Kalaivani bus stop.");
    fireEvent.drop(screen.getByRole("group", { name: "Photos (optional)" }), { dataTransfer: { files: [jpg("pothole.jpg")] } });

    const time = screen.getByLabelText("Preferred time for site inspection");
    fireEvent.click(time);
    const dialog = screen.getByRole("dialog", { name: "Choose a time" });
    expect(within(dialog).queryByRole("option", { name: "01 PM" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("option", { name: "05 PM" }));
    expect(within(dialog).getByRole("option", { name: "45" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(within(dialog).getByRole("option", { name: "02 PM" }));
    fireEvent.click(within(dialog).getByRole("option", { name: "30" }));
    expect(time).toHaveValue("02:30 PM");
    expect(document.querySelector<HTMLInputElement>("input[name=inspectionTime]")!.value).toBe("14:30");

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Meena Rajendran" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98410 23456" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit grievance" }));

    expect(await screen.findByText("Grievance registered")).toBeInTheDocument();
    const ref = document.getElementById("gr-ref")!.textContent!;
    expect(ref).toMatch(/^AMC\/GR\/\d{4}\/\d{6}$/);
    await waitFor(() => expect(listApplications()[0]).toMatchObject({
      ref, service: "grievance", status: "Submitted", applicant: "Meena Rajendran",
      details: { category: "roads", ward: "W14", inspectionTime: "14:30", photos: "pothole.jpg", mobile: "9841023456" },
    }));
    expect(listSms()[0]).toMatchObject({ to: "9841023456" });
    expect(listSms()[0].body).toContain(ref);
  });
});
