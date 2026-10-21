import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

if (typeof document !== "undefined") {
  afterEach(() => cleanup());

  // jsdom lacks matchMedia / ResizeObserver, which framer-motion and chart
  // libraries probe for. Provide inert implementations.
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

  if (!window.HTMLElement.prototype.scrollTo) {
    window.HTMLElement.prototype.scrollTo = function scrollTo() {};
  }
}

if (typeof window === "undefined") {
  // No-op in node environment tests.
  vi.stubEnv("TZ", "UTC");
}
