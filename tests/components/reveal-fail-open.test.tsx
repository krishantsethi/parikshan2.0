import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";

import { AnimatedCounter, Reveal } from "@/components/vfx/motion";

/**
 * Regression coverage for the "invisible landing page" failure mode.
 *
 * `Reveal` used to drive its entrance with framer-motion's `initial` prop,
 * which is serialized into the server HTML as inline `opacity:0`. Content only
 * became visible once JS hydrated AND an IntersectionObserver fired. Inside a
 * throttled cross-origin iframe (sandbox previews) — or with scripts blocked —
 * the observer never fired and whole sections, including the hero headline,
 * stayed invisible. Motion must always be fail-open: visible by default,
 * animated as an enhancement.
 */
describe("Reveal fail-open behaviour", () => {
  it("renders children in the server HTML without an inline opacity:0", () => {
    const html = renderToString(
      <Reveal>
        <h1>Your health records, finally understood</h1>
      </Reveal>,
    );

    expect(html).toContain("Your health records, finally understood");
    expect(html).toContain("<h1");
    // The core assertion: no stranded invisible state in the SSR payload.
    expect(html.replace(/\s/g, "")).not.toContain("opacity:0");
  });

  it("marks the element so the <noscript> safety net can force it visible", () => {
    const html = renderToString(
      <Reveal>
        <p>Marked content</p>
      </Reveal>,
    );

    expect(html).toContain("data-pk-reveal");
  });

  it("keeps content visible and rendered on the client too", () => {
    render(
      <Reveal as="section" className="hero">
        <p>Client rendered body</p>
      </Reveal>,
    );

    expect(screen.getByText("Client rendered body")).toBeInTheDocument();
    expect(screen.getByText("Client rendered body").closest("section")).toHaveClass("hero");
  });

  it("honours the requested element type in server markup", () => {
    expect(renderToString(<Reveal as="li">item</Reveal>)).toContain("<li");
    expect(renderToString(<Reveal as="article">item</Reveal>)).toContain("<article");
  });
});

describe("AnimatedCounter fail-open behaviour", () => {
  it("renders the real value in the server HTML, never a misleading zero", () => {
    const html = renderToString(<AnimatedCounter value={1240} suffix="+" />);

    // en-IN grouping: 1240 -> "1,240"
    expect(html).toContain("1,240");
    expect(html).toContain("+");
    expect(html).not.toContain(">0<");
  });

  it("renders the true value on first client paint before any count-up", () => {
    render(<AnimatedCounter value={87} decimals={0} />);

    expect(screen.getByText("87")).toBeInTheDocument();
  });
});
