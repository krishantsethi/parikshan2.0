import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { ApiError } from "@/server/auth/guard";
import { checkRateLimit } from "@/server/security/rate-limit";

/** JSON success response with no-store caching (authenticated data). */
export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function jsonError(message: string, status: number, code = "error"): NextResponse {
  return NextResponse.json({ error: message, code }, { status, headers: { "cache-control": "no-store" } });
}

/** Map thrown errors to safe HTTP responses. Never leaks stack traces. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status, error.code);
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path.join(".");
    return NextResponse.json(
      {
        error: first?.message ?? "Invalid input.",
        code: "validation_error",
        field: path || undefined,
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  console.error("[parikshan] Unhandled API error:", error instanceof Error ? error.message : error);
  return jsonError("An unexpected error occurred. Please try again.", 500, "internal");
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "invalid_json");
  }
  return schema.parse(raw);
}

export function parseSearchParams<T>(request: Request, schema: ZodSchema<T>): T {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (value !== "") obj[key] = value;
  }
  return schema.parse(obj);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

/** Throws 429 with Retry-After when the rate limit is exceeded. */
export function enforceRateLimit(
  request: Request,
  bucket: string,
  overrides?: { max?: number; windowSeconds?: number },
): void {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${bucket}:${ip}`, overrides);
  if (!result.ok) {
    throw new ApiError(
      429,
      `Too many requests. Please wait ${result.retryAfterSeconds}s and try again.`,
      "rate_limited",
    );
  }
}

/** Constant-time-ish compare used to equalize login timing for unknown emails. */
export const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$00000000000000000000000000000000$" + "0".repeat(128);
