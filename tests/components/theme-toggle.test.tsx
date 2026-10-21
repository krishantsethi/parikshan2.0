import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  it("switches the document theme and persists a cookie", () => {
    document.documentElement.dataset.theme = "dark";
    render(
      <ThemeProvider theme="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: "Switch to light theme" });
    fireEvent.click(button);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.cookie).toContain("pk_theme=light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });
});
