import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FaqExplorer } from "@/components/marketing/faq-explorer";
import { FAQ_ENTRIES } from "@/content/faq";

describe("FaqExplorer", () => {
  it("shows every question initially", () => {
    render(<FaqExplorer entries={FAQ_ENTRIES} categories={["Getting started", "Documents & OCR"]} />);
    expect(screen.getByText(FAQ_ENTRIES[0]!.question)).toBeInTheDocument();
    expect(screen.getByText(`${FAQ_ENTRIES.length} of ${FAQ_ENTRIES.length} questions shown`)).toBeInTheDocument();
  });

  it("filters questions by search terms across question and answer text", () => {
    render(<FaqExplorer entries={FAQ_ENTRIES} categories={["Getting started", "Documents & OCR"]} />);
    const search = screen.getByLabelText("Search frequently asked questions");
    fireEvent.change(search, { target: { value: "tesseract" } });
    expect(screen.getByText(/of \d+ questions shown/)).toHaveTextContent(/of 24 questions shown/);
    expect(screen.getByText(/How accurate is the OCR/i)).toBeInTheDocument();
    expect(screen.queryByText(FAQ_ENTRIES[0]!.question)).not.toBeInTheDocument();
  });

  it("shows an empty state for unmatched searches and can reset", () => {
    render(<FaqExplorer entries={FAQ_ENTRIES} categories={["Getting started"]} />);
    const search = screen.getByLabelText("Search frequently asked questions");
    fireEvent.change(search, { target: { value: "zzzzz-no-match" } });
    expect(screen.getByText("No matching questions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText(FAQ_ENTRIES[0]!.question)).toBeInTheDocument();
  });

  it("expands an answer with accessible aria-expanded state", () => {
    render(<FaqExplorer entries={FAQ_ENTRIES.slice(0, 3)} categories={["Getting started"]} />);
    const trigger = screen.getByRole("button", { name: FAQ_ENTRIES[0]!.question });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
