import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import Shell from "@/components/layout/Shell";

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Current URL">
      {location.pathname}
      {location.search}
    </output>
  );
}
function setup(path = "/dashboard?department=CSE&year=2") {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ authenticity: "Demonstration data" }), {
          status: 200,
        }),
    ),
  );
  window.scrollTo = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="*" element={<Location />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("workspace navigation", () => {
  it("collapses the sidebar without losing accessible destinations", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Overview" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });
  it("opens the command palette by keyboard and preserves cohort filters on navigation", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByRole("combobox"), "insights");
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByLabelText("Current URL")).toHaveTextContent(
        "/insights?department=CSE&year=2",
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("opens an exact student ID without adding invented API search parameters", async () => {
    const user = setup();
    await user.click(
      screen.getByRole("button", { name: "Search and navigate" }),
    );
    await user.type(screen.getByRole("combobox"), "STU001");
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByLabelText("Current URL")).toHaveTextContent(
        "/students/STU001?department=CSE&year=2",
      ),
    );
  });
  it("restores focus when Escape closes the search dialog", async () => {
    const user = setup();
    const trigger = screen.getByRole("button", { name: "Search and navigate" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
