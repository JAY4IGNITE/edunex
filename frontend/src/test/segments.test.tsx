import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Segments from "@/pages/Segments";

afterEach(() => vi.unstubAllGlobals());
it("returns focus to the selected segment after closing its detail dialog", async () => {
  const segment = {
    segment_id: "TEST_SEGMENT",
    name: "Example analytical segment",
    description: "Test-only segment fixture.",
    student_count: 0,
    percentage_of_population: 0,
    criteria: "Configured analytical combination.",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/segments")
              ? { total_students: 0, segments: [segment] }
              : { ...segment, characteristics: {}, students: [] },
          ),
          { status: 200 },
        ),
    ),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Segments />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const trigger = await screen.findByRole("button", {
    name: "View characteristics",
  });
  const user = userEvent.setup();
  await user.click(trigger);
  expect(
    await screen.findByText("No students in this segment."),
  ).toBeInTheDocument();
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});
