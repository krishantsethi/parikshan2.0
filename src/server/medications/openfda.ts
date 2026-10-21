/**
 * OpenFDA drug-label lookup (optional, disabled by default).
 *
 * What this actually does: queries the official US FDA drug label API for a
 * label whose `drug_interactions` section mentions both medicines, and quotes
 * the relevant sentence. It is NOT a severity-graded interaction database, so
 * findings from this source are always severity "unknown".
 *
 * NOTE ON VERIFICATION: this environment's outbound network policy does not
 * include api.fda.gov, so live calls could not be exercised here. The adapter
 * is therefore marked "implemented but not verified" in the docs and is off
 * by default (OPENFDA_ENABLED=false).
 */

export interface OpenFdaMention {
  description: string;
  retrievedAt: string;
}

const API_BASE = "https://api.fda.gov/drug/label.json";

interface OpenFdaResponse {
  results?: Array<{
    drug_interactions?: string[];
    openfda?: { generic_name?: string[]; brand_name?: string[] };
  }>;
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
}

export async function lookupOpenFdaMention(
  drug: string,
  otherDrug: string,
  options: { apiKey?: string | null; timeoutMs?: number } = {},
): Promise<OpenFdaMention | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  const search = encodeURIComponent(`drug_interactions:"${otherDrug}" AND openfda.generic_name:"${drug}"`);
  const key = options.apiKey ? `&api_key=${encodeURIComponent(options.apiKey)}` : "";

  try {
    const response = await fetch(`${API_BASE}?search=${search}&limit=1${key}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (response.status === 404) return null; // no matching label
    if (!response.ok) throw new Error(`OpenFDA HTTP ${response.status}`);
    const body = (await response.json()) as OpenFdaResponse;
    const section = body.results?.[0]?.drug_interactions?.[0];
    if (!section) return null;

    const relevant =
      sentences(section).find((s) => s.toLowerCase().includes(otherDrug.toLowerCase())) ??
      sentences(section)[0];
    if (!relevant) return null;

    return {
      description: `${relevant.slice(0, 420)}${relevant.length > 420 ? "…" : ""}`,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("OpenFDA request failed");
  } finally {
    clearTimeout(timeout);
  }
}
