import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

describe("Button", () => {
  it("renders its label and is keyboard-focusable", () => {
    render(<Button>Upload report</Button>);
    const button = screen.getByRole("button", { name: "Upload report" });
    expect(button).toBeEnabled();
    button.focus();
    expect(button).toHaveFocus();
  });

  it("disables itself and announces busy state while loading", () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("Alert", () => {
  it("uses alert semantics for dangerous tones", () => {
    render(<Alert tone="danger" title="Not allowed">No access</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("No access")).toBeInTheDocument();
  });

  it("uses status semantics for informational tones", () => {
    render(<Alert tone="info" title="Heads up">Info</Alert>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("Badge and EmptyState", () => {
  it("renders tone classes and heading", () => {
    render(
      <div>
        <Badge tone="success">Verified</Badge>
        <EmptyState title="Nothing here yet" description="Upload a report to begin." />
      </div>,
    );
    expect(screen.getByText("Verified")).toHaveClass("text-success");
    expect(screen.getByRole("heading", { name: "Nothing here yet" })).toBeInTheDocument();
    expect(screen.getByText("Upload a report to begin.")).toBeInTheDocument();
  });
});
