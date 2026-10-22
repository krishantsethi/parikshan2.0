/**
 * Browser Storage Access API helpers.
 *
 * When PARIKSHAN is embedded in a cross-origin frame (sandbox / Vercel preview
 * panels), its cookies are third-party. Browsers that block third-party cookies
 * by default — Safari ITP, Firefox, and Chrome's phase-out — drop the session
 * cookie even with `SameSite=None; Secure; Partitioned`. The Storage Access API
 * lets the framed document ask the user, via a genuine gesture such as clicking
 * "Try the interactive demo", to grant cookie access for this site.
 *
 * Every call is feature-detected. Where the API is absent (or the document is
 * not framed) the helpers resolve optimistically and behaviour is unchanged.
 */

type StorageAccessDocument = Document & {
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
};

function storageDoc(): StorageAccessDocument {
  return document as StorageAccessDocument;
}

/** True when this document is framed by another top-level window. */
export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Reading window.top throws under strict cross-origin isolation; being
    // unable to read it means we are framed.
    return true;
  }
}

/** Whether this browser implements the Storage Access API. */
export function supportsStorageAccess(): boolean {
  return typeof storageDoc().requestStorageAccess === "function";
}

/**
 * Current cookie/storage access state for this frame. Resolves true when the
 * document is top-level, when the API is unavailable, or when access is already
 * granted — i.e. anything other than a confirmed denial is treated as usable.
 */
export async function hasStorageAccess(): Promise<boolean> {
  if (!isFramed()) return true;
  const doc = storageDoc();
  if (typeof doc.hasStorageAccess !== "function") return true;
  try {
    return await doc.hasStorageAccess();
  } catch {
    return true;
  }
}

/**
 * Ensure the frame can use cookies, prompting the browser if needed.
 *
 * MUST be called from a user gesture (click/submit) — browsers reject
 * `requestStorageAccess` outside one. Resolves true when access is available
 * afterwards, false only on an explicit refusal or failure.
 */
export async function ensureStorageAccess(): Promise<boolean> {
  if (!isFramed()) return true;
  const doc = storageDoc();
  if (typeof doc.hasStorageAccess === "function") {
    try {
      if (await doc.hasStorageAccess()) return true;
    } catch {
      return true;
    }
  }
  if (typeof doc.requestStorageAccess !== "function") return true;
  try {
    await doc.requestStorageAccess();
    return true;
  } catch {
    return false;
  }
}
