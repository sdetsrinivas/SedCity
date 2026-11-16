import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearch } from "@/modules/home/GlobalSearch";
import { renderWithProviders } from "./render";
import { router } from "./setup";

describe("GlobalSearch (TXT-14)", () => {
  it("suggests services and navigates with the keyboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlobalSearch />);
    const box = screen.getByRole("combobox", { name: "Search services" });
    await user.type(box, "birth");
    expect(await screen.findByRole("option", { name: /Birth certificate/ })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(router.push).toHaveBeenCalledWith("/certificates/birth");
  });

  it("shows a no-results message and ignores 1-character queries", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlobalSearch />);
    const box = screen.getByRole("combobox", { name: "Search services" });
    await user.type(box, "x");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(box, "yzzy");
    expect(await screen.findByText("No matching services. Try another word.")).toBeInTheDocument();
  });
});
