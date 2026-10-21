import { getConfig } from "@/lib/env";

/**
 * Modular OCR layer.
 *
 * The only production-ready provider shipped here is tesseract.js (local,
 * no cloud credentials). Cloud providers can be added by implementing
 * `OcrProvider` — the pipeline depends solely on this interface.
 */

export interface OcrResult {
  text: string;
  /** Provider confidence 0..1 (null when the provider cannot report one). */
  confidence: number | null;
  engine: string;
}

export interface OcrProvider {
  readonly id: string;
  readonly label: string;
  /** True when the provider is usable in this deployment. */
  isAvailable(): boolean;
  recognizeImage(bytes: Uint8Array, mime: string): Promise<OcrResult>;
}

export class OcrUnavailableError extends Error {}

export class TesseractOcrProvider implements OcrProvider {
  readonly id = "ocr_tesseract";
  readonly label = "tesseract.js (local OCR)";
  private workerPromise: Promise<import("tesseract.js").Worker> | null = null;

  constructor(private readonly languages: string) {}

  isAvailable(): boolean {
    return true;
  }

  private async getWorker(): Promise<import("tesseract.js").Worker> {
    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        const { createWorker } = await import("tesseract.js");
        return createWorker(this.languages);
      })().catch((error) => {
        this.workerPromise = null;
        throw new OcrUnavailableError(
          `OCR engine could not start: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    return this.workerPromise;
  }

  async recognizeImage(bytes: Uint8Array, _mime: string): Promise<OcrResult> {
    const worker = await this.getWorker();
    const buffer = Buffer.from(bytes);
    const { data } = await worker.recognize(buffer);
    const confidence = typeof data.confidence === "number" ? data.confidence / 100 : null;
    return { text: data.text ?? "", confidence, engine: this.id };
  }
}

export class DisabledOcrProvider implements OcrProvider {
  readonly id = "none";
  readonly label = "OCR disabled";
  isAvailable(): boolean {
    return false;
  }
  async recognizeImage(): Promise<OcrResult> {
    throw new OcrUnavailableError(
      "OCR is disabled on this deployment (OCR_PROVIDER=none). Enable tesseract OCR or upload a digital PDF with a text layer.",
    );
  }
}

/** Provider selection is config-driven; swap freely without touching the pipeline. */
export function getOcrProvider(): OcrProvider {
  const cfg = getConfig();
  if (cfg.ocr.provider === "tesseract") {
    return new TesseractOcrProvider(cfg.ocr.languages);
  }
  return new DisabledOcrProvider();
}

/** Release a warm worker (called on process shutdown in tests/local dev). */
export async function shutdownOcr(): Promise<void> {
  // Providers are created per-request by design; long-lived workers are kept
  // per provider instance. Nothing global to tear down here.
}
