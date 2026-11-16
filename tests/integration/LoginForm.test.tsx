import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/modules/auth/LoginForm";
import { renderWithProviders, captchaAnswer } from "./render";
import { router } from "./setup";

async function fillCredentials(user: ReturnType<typeof userEvent.setup>, container: HTMLElement, username: string, password: string) {
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password", { selector: "input" }), password);
  await user.type(screen.getByPlaceholderText("Answer"), captchaAnswer(container));
}

describe("LoginForm", () => {
  it("BTN-06: Sign in enables only when username, 6+ char password and captcha are present", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    const btn = screen.getByRole("button", { name: "Sign in" });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText("Username"), "meena.r");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "12345");
    await user.type(screen.getByPlaceholderText("Answer"), "3");
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "6");
    expect(btn).toBeEnabled();
  });

  it("wrong captcha shows an error and issues a new challenge", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);
    const tokenInput = container.querySelector("input[name=captcha_token]") as HTMLInputElement;
    const before = tokenInput.value;
    await user.type(screen.getByLabelText("Username"), "meena.r");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Astheen@123");
    await user.type(screen.getByPlaceholderText("Answer"), String(Number(captchaAnswer(container)) + 1));
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/security check answer is incorrect/);
    await waitFor(() => expect(tokenInput.value).not.toBe(before));
    expect(screen.getByPlaceholderText("Answer")).toHaveValue("");
  });

  it("full sign-in: credentials → OTP toast + SMS copy → verify → session + redirect", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);
    await fillCredentials(user, container, "meena.r", "Astheen@123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const toast = await screen.findByText(/^OTP: \d{6}$/);
    const otp = toast.textContent!.replace("OTP: ", "");
    expect(screen.getByText("OTP sent to +91 98XXX XX456")).toBeInTheDocument();
    const sms = JSON.parse(localStorage.getItem("amc.sms")!);
    expect(sms[0].body).toContain(otp);

    await user.type(screen.getByLabelText("One-time password"), otp);
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    // CHK-01 default (ticked) → session kept in localStorage
    expect(JSON.parse(localStorage.getItem("amc.session")!).username).toBe("meena.r");
  });

  it("respects ?next= and refuses protocol-relative redirects", async () => {
    const user = userEvent.setup();
    const { container, unmount } = renderWithProviders(<LoginForm next="//evil.example" />);
    await fillCredentials(user, container, "arul.k", "Arul@2026");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const otp = (await screen.findByText(/^OTP: \d{6}$/)).textContent!.slice(5);
    await user.type(screen.getByLabelText("One-time password"), otp);
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    unmount();
  });

  it("officer role: label changes and officer lands on the work queue", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);
    await user.click(screen.getByRole("tab", { name: "Officer" }));
    expect(screen.getByRole("tab", { name: "Officer" })).toHaveAttribute("aria-selected", "true");
    await user.type(screen.getByLabelText("Employee username"), "officer.selvi");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Officer@123");
    await user.type(screen.getByPlaceholderText("Answer"), captchaAnswer(container));
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const otp = (await screen.findByText(/^OTP: \d{6}$/)).textContent!.slice(5);
    await user.type(screen.getByLabelText("One-time password"), otp);
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/officer/queue"));
  });

  it("renders in Tamil", () => {
    renderWithProviders(<LoginForm />, "ta");
    expect(screen.getByRole("button", { name: "உள்நுழை" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "அலுவலர்" })).toBeInTheDocument();
  });
});
