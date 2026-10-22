import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// ThemeProvider (pulled in via AppProviders) reads the app router; the notice
// itself does not, so an inert router stub is all the tree needs.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { AppProviders } from "@/components/providers/app-providers";
import { StorageAccessNotice } from "@/components/auth/storage-access-notice";
import {
  ensureStorageAccess,
  hasStorageAccess,
  isFramed,
  supportsStorageAccess,
} from "@/lib/storage-access";

function setFrame(framed: boolean) {
  Object.defineProperty(window, "top", {
    configurable: true,
    get: () => (framed ? ({} as Window) : window),
  });
}

/**
 * Stub the Storage Access API as own properties on the document instance.
 * defineProperty sidesteps lib.dom's (conditionally present) declarations
 * without any unsafe cast.
 */
function setStorageAccess(impl: {
  has?: () => Promise<boolean>;
  request?: () => Promise<void>;
}) {
  if (impl.has) {
    Object.defineProperty(document, "hasStorageAccess", { configurable: true, value: impl.has });
  } else {
    Reflect.deleteProperty(document, "hasStorageAccess");
  }
  if (impl.request) {
    Object.defineProperty(document, "requestStorageAccess", {
      configurable: true,
      value: impl.request,
    });
  } else {
    Reflect.deleteProperty(document, "requestStorageAccess");
  }
}

function clearStorageAccess() {
  Reflect.deleteProperty(document, "hasStorageAccess");
  Reflect.deleteProperty(document, "requestStorageAccess");
}

afterEach(() => {
  setFrame(false);
  clearStorageAccess();
  vi.restoreAllMocks();
});

describe("storage access helpers", () => {
  it("reports top-level documents as unframed with full access", async () => {
    setFrame(false);
    setStorageAccess({ has: () => Promise.resolve(false) });

    expect(isFramed()).toBe(false);
    // Top-level always wins: a framed-only denial must not affect it.
    expect(await hasStorageAccess()).toBe(true);
    expect(await ensureStorageAccess()).toBe(true);
  });

  it("detects a cross-origin frame", () => {
    setFrame(true);
    expect(isFramed()).toBe(true);
  });

  it("is optimistic when the browser lacks the Storage Access API", async () => {
    setFrame(true);
    clearStorageAccess();

    expect(supportsStorageAccess()).toBe(false);
    expect(await hasStorageAccess()).toBe(true);
    expect(await ensureStorageAccess()).toBe(true);
  });

  it("grants access through a request when currently denied", async () => {
    setFrame(true);
    const request = vi.fn(() => Promise.resolve());
    setStorageAccess({ has: () => Promise.resolve(false), request });

    expect(await ensureStorageAccess()).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not re-request when access is already granted", async () => {
    setFrame(true);
    const request = vi.fn(() => Promise.resolve());
    setStorageAccess({ has: () => Promise.resolve(true), request });

    expect(await ensureStorageAccess()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it("reports refusal honestly instead of pretending success", async () => {
    setFrame(true);
    setStorageAccess({
      has: () => Promise.resolve(false),
      request: () => Promise.reject(new Error("denied")),
    });

    expect(await ensureStorageAccess()).toBe(false);
  });
});

describe("StorageAccessNotice", () => {
  function renderNotice() {
    return render(
      <AppProviders locale="en" theme="dark">
        <StorageAccessNotice />
      </AppProviders>,
    );
  }

  it("renders nothing when access is fine (top-level)", async () => {
    setFrame(false);
    const { container } = renderNotice();

    await waitFor(() => expect(container.textContent).not.toContain("preview frame"));
    expect(screen.queryByText("Open in a full tab")).not.toBeInTheDocument();
  });

  it("explains the situation and offers a first-party escape hatch when blocked", async () => {
    setFrame(true);
    setStorageAccess({ has: () => Promise.resolve(false) });

    renderNotice();

    expect(await screen.findByText("You are viewing PARIKSHAN inside a preview frame")).toBeInTheDocument();
    // No Storage Access API in this stub, so the grant button is hidden but the
    // escape hatch must always be offered.
    expect(screen.queryByText("Allow cookies for this preview")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open in a full tab" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("grants access from the button and then removes itself", async () => {
    setFrame(true);
    const request = vi.fn(() => Promise.resolve());
    setStorageAccess({ has: () => Promise.resolve(false), request });

    renderNotice();

    const button = await screen.findByRole("button", { name: "Allow cookies for this preview" });
    fireEvent.click(button);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText("You are viewing PARIKSHAN inside a preview frame")).not.toBeInTheDocument(),
    );
  });

  it("keeps the notice when the browser refuses the grant", async () => {
    setFrame(true);
    setStorageAccess({
      has: () => Promise.resolve(false),
      request: () => Promise.reject(new Error("denied")),
    });

    renderNotice();

    const button = await screen.findByRole("button", { name: "Allow cookies for this preview" });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByText("You are viewing PARIKSHAN inside a preview frame")).toBeInTheDocument(),
    );
  });
});
