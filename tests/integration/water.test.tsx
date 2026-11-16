import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { WaterPay } from "@/modules/water/WaterPay";

describe("Water bill lookup", () => {
  it("reformats the consumer number on blur and shows the bill after lookup", async () => {
    renderWithProviders(<WaterPay initialRef="" />);
    const input = screen.getByLabelText("Consumer number") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0201400731" } });
    expect(input.value).toBe("0201400731");
    fireEvent.blur(input);
    expect(input.value).toBe("W02-014-00731");

    fireEvent.click(screen.getByRole("button", { name: "Fetch bill" }));
    const region = await screen.findByRole("region", { name: "Bill details" });
    expect(within(region).getByText("Meena Rajendran")).toBeInTheDocument();
    expect(document.querySelectorAll("#bill-charges > tbody > tr")).toHaveLength(5);
    expect(document.getElementById("amount-due")!.textContent).toBe("₹ 332.50");
  });

  it("shows a not-found alert for an unknown consumer and a format error for bad input", async () => {
    renderWithProviders(<WaterPay initialRef="" />);
    const input = screen.getByLabelText("Consumer number");
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch bill" }));
    expect(screen.getByText("Enter the 10-digit consumer number shown on your bill.")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "W06-047-99999" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch bill" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("W06-047-99999");
    expect(screen.queryByRole("region", { name: "Bill details" })).toBeNull();
  });

  it("fetches straight away when opened from Quick Pay with ?ref=", async () => {
    renderWithProviders(<WaterPay initialRef="w0401400731" />);
    expect((screen.getByLabelText("Consumer number") as HTMLInputElement).value).toBe("W04-014-00731");
    expect(await screen.findByRole("alert")).toHaveTextContent("No water connection");
  });

  it("renders in Tamil", async () => {
    renderWithProviders(<WaterPay initialRef="W04-029-00057" />, "ta");
    const region = await screen.findByRole("region", { name: "கட்டண விவரங்கள்" });
    expect(within(region).getByText("ஸ்ரீ வள்ளி சிற்றுண்டி நிலையம்")).toBeInTheDocument();
    expect(within(region).getByText("வணிக உபயோகம்")).toBeInTheDocument();
  });
});
