import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/filters/FilterBar";
import { StudentTable } from "@/components/tables/StudentTable";
import { useFilters } from "@/hooks/useFilters";
function RapidFilters() {
  const { setFilters } = useFilters();
  return (
    <button
      onClick={() => {
        setFilters((current) => ({ ...current, year: 1 }));
        setFilters((current) => ({ ...current, semester: 1 }));
      }}
    >
      Change both filters
    </button>
  );
}
function Location() {
  return <output aria-label="Current URL">{useLocation().search}</output>;
}
afterEach(() => vi.unstubAllGlobals());
describe("cohort controls", () => {
  it("preserves successive filter changes before the navigation render commits", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/students?department=Electronics&year=2&semester=4&page=3",
        ]}
      >
        <RapidFilters />
        <Location />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Change both filters" }),
    );
    expect(screen.getByLabelText("Current URL")).toHaveTextContent(
      "department=Electronics&year=1&semester=1",
    );
    expect(screen.getByLabelText("Current URL")).not.toHaveTextContent("page=");
  });
  it("applies exact department, resets page and clears filters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/students?page=3&year=2"]}>
        <FilterBar />
        <Location />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("Department"), "CSE");
    await user.click(screen.getByRole("button", { name: "Apply department" }));
    expect(screen.getByLabelText("Current URL")).toHaveTextContent(
      "department=CSE",
    );
    expect(screen.getByLabelText("Current URL")).not.toHaveTextContent("page=");
    await user.click(screen.getByLabelText("Reset filters"));
    expect(screen.getByLabelText("Current URL")).toBeEmptyDOMElement();
  });
});
describe("student page", () => {
  it("requests only a bounded backend-filtered page and handles no matching students", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requests.push(url);
        return new Response("[]", { status: 200 });
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/students?department=CSE&page=2"]}>
          <StudentTable />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText("No students match these filters."),
    ).toBeInTheDocument();
    expect(requests).toEqual(["/api/students?department=CSE&skip=10&limit=10"]);
  });
  it("shows a readable error with retry instead of backend traces", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("secret traceback", { status: 500 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StudentTable />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText("Unable to load students."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret traceback/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(
        screen.getByText("No students match these filters."),
      ).toBeInTheDocument(),
    );
  });
});
