# Interoperability: FHIR export and the ABDM boundary

## What is implemented

`GET /api/fhir/export?profileId=…` returns an R4-shaped **collection Bundle** for one profile the caller owns:

| PARIKSHAN entity | FHIR resource | Notes |
| --- | --- | --- |
| Health profile | `Patient` | identifier `https://parikshan.health/profile-id`, name, gender, birthDate, blood-group extension |
| Observation | `Observation` | category `laboratory`, `valueQuantity` (or `valueString` if non-numeric), `referenceRange` from the printed range, `interpretation` L/N/H, `derivedFrom` the source DocumentReference |
| Medical document | `DocumentReference` | `content.attachment` metadata (type, title, size), demo tag when the title is a SAMPLE record |
| Medication | `MedicationStatement` | status, `medicationCodeableConcept.text`, dosage text as recorded |

Resources carry `meta.tag` identifying the PARIKSHAN export and demo data, plus `meta.lastUpdated`.

### Explicit scope limits

- This is an **export mapping**, not a FHIR server. There is no FHIR search, capability statement, validation, terminology binding, or write API.
- Resources have **not** been validated against a FHIR validator in this environment.
- No HIE/ABDM gateway has received these resources.
- No claim of “FHIR compliance” is made.

## ABDM / ABHA boundary

`src/server/interop/abdm.ts` defines the adapter interface and required configuration:

```
ABDM_BASE_URL
ABDM_CLIENT_ID
ABDM_CLIENT_SECRET
ABDM_HIP_ID
ABDM_HIU_ID
```

The shipped adapter is `NotConfiguredAbdmAdapter`: every method rejects and **no network calls are made**. The UI labels ABHA/ABDM as “not connected” and lists the missing variables in Settings → System status.

A real implementation would additionally require:

1. Organizational ABDM onboarding (HIP/HIU roles) and sandbox access.
2. Consent-flow implementation (`/consent/v3/request`), callback handling, and data-lifecycle tracking.
3. Health-information encryption per ABDM spec (Diffie-Hellman key exchange), key management, and audit.
4. A security review and legal review before processing real patient data.
5. Explicit patient consent UI that records scope, purpose, and expiry.

PARIKSHAN does **not** collect ABHA numbers or credentials, and makes no government-connectivity claim.

## Identifier strategy

- Every entity uses a UUID primary key, suitable as a FHIR `id`.
- The `Patient` identifier system is PARIKSHAN-scoped; national identifiers would be added only through an onboarding flow with consent.
- Document provenance is preserved via `Observation.derivedFrom` and the document's extracted text record.
