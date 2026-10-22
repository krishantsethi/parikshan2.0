import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

if (typeof document !== "undefined") {
  afterEach(() => cleanup());

  // jsdom lacks matchMedia / ResizeObserver / IntersectionObserver, which
  // framer-motion and chart libraries probe for. Provide inert implementations.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }

  // framer-motion's useInView needs IntersectionObserver. The stub deliberately
  // never reports an intersection, so reveal-driven components stay in their
  // pre-animation state — which is what the fail-open tests assert on.
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  if (!("IntersectionObserver" in globalThis)) {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      IntersectionObserverStub;
  }

  if (!window.HTMLElement.prototype.scrollTo) {
    window.HTMLElement.prototype.scrollTo = function scrollTo() {};
  }
}

if (typeof window === "undefined") {
  // No-op in node environment tests.
  vi.stubEnv("TZ", "UTC");
}
