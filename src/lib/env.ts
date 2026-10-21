/**
 * Typed, validated environment configuration.
 * Server-only: never import this from client components.
 *
 * Every integration is OPTIONAL. The app boots in an honest demo mode when
 * nothing is configured — features degrade with explicit "not configured"
 * states instead of fake behavior.
 */

export interface AiConfig {
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  maxTokens: number;
}

export interface OcrConfig {
  provider: "tesseract" | "none";
  languages: string;
}

export interface AppConfig {
  appUrl: string;
  authSecret: string;
  /** True when AUTH_SECRET was not supplied and a dev fallback is in use. */
  insecureAuthSecret: boolean;
  sessionTtlHours: number;
  databaseUrl: string | null;
  storageDriver: "auto" | "postgres" | "memory";
  uploadMaxBytes: number;
  ai: AiConfig;
  ocr: OcrConfig;
  openfda: { enabled: boolean; apiKey: string | null };
  rateLimit: { max: number; windowSeconds: number };
  demoMode: boolean;
  isProduction: boolean;
}

const DEV_FALLBACK_SECRET = "parikshan-development-only-insecure-secret";

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = env.NODE_ENV === "production";
  const authSecret = env.AUTH_SECRET?.trim();
  const insecureAuthSecret = !authSecret;
  if (insecureAuthSecret && isProduction) {
    // Loud, single-line warning; never fatal so demo deployments still boot.
    console.warn(
      "[parikshan] AUTH_SECRET is not set — using an insecure development fallback. " +
        "Set AUTH_SECRET before serving real users.",
    );
  }

  const uploadMaxMb = clampInt(int(env.UPLOAD_MAX_MB, 10), 1, 25, 10);

  return {
    appUrl: env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
    authSecret: authSecret || DEV_FALLBACK_SECRET,
    insecureAuthSecret,
    sessionTtlHours: clampInt(int(env.SESSION_TTL_HOURS, 168), 1, 24 * 90, 168),
    databaseUrl: env.DATABASE_URL?.trim() || null,
    storageDriver: (["auto", "postgres", "memory"].includes((env.STORAGE_DRIVER ?? "").trim())
      ? (env.STORAGE_DRIVER as AppConfig["storageDriver"])
      : "auto") as AppConfig["storageDriver"],
    uploadMaxBytes: uploadMaxMb * 1024 * 1024,
    ai: {
      enabled: Boolean(env.OPENAI_API_KEY?.trim()),
      apiKey: env.OPENAI_API_KEY?.trim() || null,
      baseUrl: (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: env.AI_MODEL?.trim() || "gpt-4o-mini",
      maxTokens: clampInt(int(env.AI_MAX_TOKENS, 900), 200, 4000, 900),
    },
    ocr: {
      provider: env.OCR_PROVIDER?.trim() === "none" ? "none" : "tesseract",
      languages: env.OCR_LANGUAGES?.trim() || "eng",
    },
    openfda: {
      enabled: bool(env.OPENFDA_ENABLED, false),
      apiKey: env.OPENFDA_API_KEY?.trim() || null,
    },
    rateLimit: {
      max: clampInt(int(env.RATE_LIMIT_MAX, 30), 1, 10000, 30),
      windowSeconds: clampInt(int(env.RATE_LIMIT_WINDOW_SECONDS, 60), 5, 3600, 60),
    },
    demoMode: bool(env.DEMO_MODE, true),
    isProduction,
  };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}

/** Human-readable capability report surfaced in Settings → System status. */
export function capabilityReport(cfg: AppConfig = getConfig()) {
  return {
    database: cfg.databaseUrl
      ? { configured: true, label: "PostgreSQL connected" }
      : { configured: false, label: "In-memory demo store (data is volatile)" },
    ai: cfg.ai.enabled
      ? { configured: true, label: `AI provider active (${cfg.ai.model})` }
      : { configured: false, label: "AI provider not configured — assistant answers are limited" },
    ocr:
      cfg.ocr.provider === "tesseract"
        ? { configured: true, label: "Local OCR (tesseract.js) active" }
        : { configured: false, label: "OCR disabled — digital PDF text only" },
    openfda: cfg.openfda.enabled
      ? { configured: true, label: "OpenFDA interaction lookups enabled" }
      : { configured: false, label: "OpenFDA disabled — curated dataset only" },
    storage: { configured: true, label: `Driver: ${cfg.storageDriver}` },
    demoMode: cfg.demoMode,
  };
}
