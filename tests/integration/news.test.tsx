import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { queryNews } from "@/mock/endpoints/news";
import { NewsFilterProvider } from "@/modules/news/NewsFilterContext";
import { NewsCategorySelect } from "@/modules/news/NewsCategorySelect";
import { NewsFeed } from "@/modules/news/NewsFeed";
import EventsOnlyToggle from "@/modules/news/EventsOnlyToggle";
import { RegisterPanel } from "@/modules/news/RegisterPanel";
import { listRegistrations } from "@/modules/news/registration";
import { listSms } from "@/lib/sms";
import type { Lang } from "@/i18n";

const first = () => queryNews({ eventsOnly: false, category: "" }, 0);

function renderList(lang: Lang = "en") {
  return renderWithProviders(
    <NewsFilterProvider>
      <NewsCategorySelect />
      <EventsOnlyToggle />
      <NewsFeed initial={first()} />
    </NewsFilterProvider>,
    lang,
  );
}

describe("News & events list", () => {
  it("shows the first eight cards with identical Read more controls", () => {
    renderList();
    expect(screen.getAllByRole("article")).toHaveLength(8);
    expect(screen.getByText("Showing 8 of 30")).toBeInTheDocument();
    expect(screen.getAllByText("Read more")).toHaveLength(8);
    const card = screen.getByRole("article", { name: "Dengue prevention: fogging schedule for November published" });
    const button = within(card).getByRole("button", { name: "Read more" });
    expect(within(card).getByText(/Keep windows open/)).not.toBeVisible();
    fireEvent.click(button);
    expect(within(card).getByText(/Keep windows open/)).toBeVisible();
    expect(within(card).getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    const event = screen.getByRole("article", { name: "Margazhi music evenings at Kalaivani Square" });
    expect(within(event).getByRole("link", { name: "Read more" })).toHaveAttribute("target", "_blank");
  });

  it("chooses a category by keyboard and reloads the list; blur closes the list", async () => {
    renderList();
    const combo = screen.getByRole("combobox", { name: "Category" });
    combo.focus();
    fireEvent.keyDown(combo, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")).toHaveLength(7);
    fireEvent.keyDown(combo, { key: "ArrowDown" });
    fireEvent.keyDown(combo, { key: "ArrowDown" });
    expect(document.getElementById(combo.getAttribute("aria-activedescendant")!)).toHaveTextContent("Health");
    fireEvent.keyDown(combo, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(combo).toHaveTextContent("Health");
    await screen.findByText("Showing 5 of 5");
    expect(screen.getAllByRole("article")).toHaveLength(5);

    fireEvent.click(combo);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.blur(combo);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("restores a saved 'events only' choice after mounting and saves changes", async () => {
    localStorage.setItem("amc.newsEventsOnly", "true");
    renderList();
    const box = screen.getByRole("checkbox", { name: "Show events only" });
    await waitFor(() => expect(box).toHaveAttribute("aria-checked", "true"));
    await screen.findByText("Showing 8 of 11");
    for (const card of screen.getAllByRole("article")) expect(within(card).getByText("Event")).toBeInTheDocument();
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem("amc.newsEventsOnly")).toBe("false");
    await screen.findByText("Showing 8 of 30");
  });

  it("renders in Tamil with every placeholder filled", () => {
    const { container } = renderList("ta");
    expect(screen.getAllByText("மேலும் படிக்க")).toHaveLength(8);
    expect(container.textContent).not.toMatch(/\{\w+\}/);
  });
});

describe("Event registration", () => {
  it("replaces the Register button when seats arrive, then registers and sends an SMS", async () => {
    renderWithProviders(<RegisterPanel slug="city-marathon-2026" />);
    const early = screen.getByRole("button", { name: "Register" });
    await screen.findByText("386 of 3000 seats available");
    const later = screen.getByRole("button", { name: "Register" });
    expect(later).not.toBe(early);
    expect(early.isConnected).toBe(false);

    fireEvent.click(later);
    fireEvent.click(screen.getByRole("button", { name: "Confirm registration" }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Meena Rajendran" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98410-23456" } });
    fireEvent.change(screen.getByLabelText("Number of people"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm registration" }));
    await screen.findByText("You are registered for Astheenapuram City Marathon 2026.");
    expect(screen.getByText("384 of 3000 seats available")).toBeInTheDocument();
    const reg = listRegistrations()["city-marathon-2026"];
    expect(reg).toMatchObject({ name: "Meena Rajendran", mobile: "9841023456", attendees: 2 });
    expect(screen.getByText(reg.ref)).toBeInTheDocument();
    const sms = listSms()[0];
    expect(sms.to).toBe("9841023456");
    expect(sms.body).toBe(`AMC: Registration ${reg.ref} confirmed for Astheenapuram City Marathon 2026 on 06/12/2026, 05:30 – 10:00, for 2 person(s). Show this SMS at the venue.`);
  });

  it("reports a failed seat check as an error that can be retried, keeping Register usable", async () => {
    const mock = (fail: string[]) => {
      document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, fail }))}; path=/`;
    };
    mock(["EVENT_SEATS"]);
    renderWithProviders(<RegisterPanel slug="city-marathon-2026" />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Seat availability could not be checked right now.");
    expect(screen.queryByText("All seats have been taken")).toBeNull();
    expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();

    mock([]);
    fireEvent.click(within(alert).getByRole("button", { name: "Check again" }));
    await screen.findByText("386 of 3000 seats available");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();
  });

  it("refuses more people than seats left and fills the Tamil messages", async () => {
    const { container } = renderWithProviders(<RegisterPanel slug="senior-health-camp" />, "ta");
    await screen.findByText("150 இல் 1 இருக்கைகள் உள்ளன");
    fireEvent.click(screen.getByRole("button", { name: "பதிவு செய்" }));
    fireEvent.change(screen.getByLabelText("நபர்களின் எண்ணிக்கை"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "பதிவை உறுதிசெய்" }));
    expect(screen.getByText("இத்தனை பேருக்குப் போதுமான இருக்கைகள் இல்லை.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\{\w+\}/);
    expect(listRegistrations()).toEqual({});
  });
});
