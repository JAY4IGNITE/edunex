import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

it("uses the system theme, toggles accessibly and remembers the choice on remount", async () => {
  const user = userEvent.setup();
  const view = render(<ThemeToggle />);
  expect(document.documentElement.dataset.theme).toBe("light");
  await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("edunex-theme")).toBe("dark");
  view.unmount();
  render(<ThemeToggle />);
  expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
});

it("keeps the toggle working when storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  render(<ThemeToggle />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Switch to dark theme" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
});

it("syncs a theme change from another tab without changing the current route", () => {
  render(<ThemeToggle />);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "edunex-theme", newValue: "dark" })));
  expect(document.documentElement.dataset.theme).toBe("dark");
});
