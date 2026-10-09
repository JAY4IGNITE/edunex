import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { LandingNavbar } from "@/pages/Landing/components/Navbar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

it("shares the landing theme choice with the workspace and remembers it on return", async () => {
  localStorage.setItem("edunex-theme", "dark");
  const user = userEvent.setup();
  const landing = render(<MemoryRouter><LandingNavbar /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("edunex-theme")).toBe("light");
  landing.unmount();

  const workspace = render(<ThemeToggle />);
  await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
  workspace.unmount();
  render(<MemoryRouter><LandingNavbar /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe("dark");
});
