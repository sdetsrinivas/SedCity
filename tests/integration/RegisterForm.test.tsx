import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "@/modules/auth/RegisterForm";
import { renderWithProviders } from "./render";
import { router } from "./setup";

describe("RegisterForm", () => {
  it("TXT-02: mobile is masked while typing character by character", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    const mobile = screen.getByLabelText("Mobile number");
    await user.type(mobile, "98410a23456789");
    expect(mobile).toHaveValue("+91 98410 23456");
  });

  it("shows validation errors for an empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your full name.");
    expect(screen.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    expect(screen.getByText("You must accept the terms to continue.")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose a username")).toHaveAttribute("aria-invalid", "true");
  });

  it("creates an account once every rule is satisfied", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByLabelText("Full name (as in Astheen ID)"), "Kavya Senthil");
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.type(screen.getByLabelText("Astheen ID"), "482177306");
    expect(screen.getByLabelText("Astheen ID")).toHaveValue("ASP-4821-7730-6");
    await user.type(screen.getByLabelText("Choose a username"), "kavya.s");
    await user.type(screen.getByLabelText("Password"), "Kavya@2026");
    await user.type(screen.getByLabelText("Confirm password"), "Kavya@2026");
    const terms = await screen.findByRole("checkbox", { name: /I agree/ });
    await user.click(terms);
    expect(terms).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login?reason=registered"));
  });

  it("rejects a taken username and an invalid Astheen check digit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByLabelText("Astheen ID"), "482177305");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter a valid Astheen ID.")).toBeInTheDocument();
  });
});
