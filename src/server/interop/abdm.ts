/**
 * ABHA / ABDM integration boundary.
 *
 * STATUS: NOT IMPLEMENTED — deliberately. This module defines the adapter
 * interface and the exact configuration that would be required, and makes no
 * network calls. PARIKSHAN makes no claim of ABDM approval, certification,
 * sandbox access, or live connectivity.
 *
 * To implement a real adapter you would need (all supplied by your
 * organization after ABDM onboarding):
 *   ABDM_BASE_URL        e.g. the sandbox or production gateway URL
 *   ABDM_CLIENT_ID       client credentials issued to your HIP/HIU
 *   ABDM_CLIENT_SECRET   secret for those credentials (server-side only)
 *   ABDM_HIP_ID          Health Information Provider facility id
 *   ABDM_HIU_ID          Health Information User id
 * plus consent-flow implementation, encryption of health information
 * (Diffie-Hellman key exchange per ABDM spec), audit logging, and a security
 * review before any real patient data is processed.
 *
 * Until then the UI presents this capability as "planned / not connected",
 * never as available.
 */

export type AbdmCapability = "patient-lookup" | "consent-request" | "health-information-request";

export interface AbdmAdapter {
  readonly id: string;
  readonly configured: boolean;
  readonly missingConfiguration: string[];
  capabilities(): AbdmCapability[];
  /** All methods reject: nothing is sent anywhere until a real adapter exists. */
  requestConsent(...args: unknown[]): Promise<never>;
  fetchHealthInformation(...args: unknown[]): Promise<never>;
}

export class AbdmNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbdmNotConfiguredError";
  }
}

const REQUIRED_VARIABLES = [
  "ABDM_BASE_URL",
  "ABDM_CLIENT_ID",
  "ABDM_CLIENT_SECRET",
  "ABDM_HIP_ID",
  "ABDM_HIU_ID",
] as const;

export class NotConfiguredAbdmAdapter implements AbdmAdapter {
  readonly id = "abdm-not-configured";
  readonly configured = false;
  readonly missingConfiguration: string[] = [...REQUIRED_VARIABLES];

  capabilities(): AbdmCapability[] {
    // Advertised only as planned; never executed.
    return [];
  }

  async requestConsent(): Promise<never> {
    throw new AbdmNotConfiguredError(
      "ABHA/ABDM integration is not configured on this deployment. No consent request was sent.",
    );
  }

  async fetchHealthInformation(): Promise<never> {
    throw new AbdmNotConfiguredError(
      "ABHA/ABDM integration is not configured on this deployment. No health-information request was sent.",
    );
  }
}

export function getAbdmAdapter(): AbdmAdapter {
  // Always the honest not-configured adapter until a reviewed implementation
  // is supplied. Do not fake connectivity.
  return new NotConfiguredAbdmAdapter();
}

/** Static summary surfaced in Settings → System status. */
export function abdmStatus() {
  return {
    connected: false,
    label: "ABHA / ABDM: not connected (integration boundary defined, no credentials configured)",
    requiredVariables: [...REQUIRED_VARIABLES],
  };
}
