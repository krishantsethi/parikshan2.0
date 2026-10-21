import type { HealthProfile, MedicalDocument, Medication, Observation } from "@/types/domain";

/**
 * FHIR R4 mapping layer (export-only).
 *
 * Scope, stated precisely: this produces FHIR-shaped JSON *resources* for
 * export and integration planning. It is NOT a certified FHIR API, does not
 * implement FHIR search/validation, and has not been tested against a FHIR
 * validator or an ABDM/HIE endpoint. See docs/INTEROPERABILITY.md.
 */

const PARIKSHAN_TAG_SYSTEM = "https://parikshan.health/tags";
const PARIKSHAN_ID_SYSTEM = "https://parikshan.health/profile-id";

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: { lastUpdated?: string; tag?: FhirCoding[]; source?: string };
  [key: string]: unknown;
}

function meta(updatedAt: Date, isDemo: boolean): FhirResource["meta"] {
  return {
    lastUpdated: updatedAt.toISOString(),
    source: "https://parikshan.health",
    tag: [
      { system: PARIKSHAN_TAG_SYSTEM, code: "parikshan-export", display: "PARIKSHAN export" },
      ...(isDemo ? [{ system: PARIKSHAN_TAG_SYSTEM, code: "demo", display: "Demonstration data" }] : []),
    ],
  };
}

function isDemoTitle(title: string): boolean {
  return /^sample\b/i.test(title);
}

export function toFhirPatient(profile: HealthProfile): FhirResource {
  return {
    resourceType: "Patient",
    id: profile.id,
    meta: meta(profile.updatedAt, false),
    identifier: [{ system: PARIKSHAN_ID_SYSTEM, value: profile.id }],
    name: [{ text: profile.name, use: "official" }],
    gender:
      profile.sex === "male" ? "male" : profile.sex === "female" ? "female" : profile.sex === "other" ? "other" : "unknown",
    ...(profile.dob ? { birthDate: profile.dob } : {}),
    ...(profile.bloodGroup
      ? {
          extension: [
            {
              url: "https://parikshan.health/fhir/StructureDefinition/blood-group",
              valueString: profile.bloodGroup,
            },
          ],
        }
      : {}),
  };
}

export function toFhirObservation(observation: Observation, profile: HealthProfile): FhirResource {
  const interpretationCode =
    observation.flag === "low" ? "L" : observation.flag === "high" ? "H" : observation.flag === "normal" ? "N" : null;

  const referenceRange =
    observation.refLow !== null || observation.refHigh !== null
      ? [
          {
            ...(observation.refLow !== null
              ? { low: { value: observation.refLow, ...(observation.unit ? { unit: observation.unit } : {}) } }
              : {}),
            ...(observation.refHigh !== null
              ? { high: { value: observation.refHigh, ...(observation.unit ? { unit: observation.unit } : {}) } }
              : {}),
            ...(observation.refText ? { text: observation.refText } : {}),
          },
        ]
      : observation.refText
        ? [{ text: observation.refText }]
        : [];

  return {
    resourceType: "Observation",
    id: observation.id,
    meta: meta(observation.updatedAt, false),
    status: observation.verified ? "final" : "preliminary",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: { text: observation.testName },
    subject: { reference: `Patient/${profile.id}`, display: profile.name },
    effectiveDateTime: observation.collectedAt
      ? `${observation.collectedAt}T00:00:00Z`
      : observation.createdAt.toISOString(),
    issued: observation.createdAt.toISOString(),
    ...(observation.valueNumeric !== null
      ? {
          valueQuantity: {
            value: observation.valueNumeric,
            ...(observation.unit ? { unit: observation.unit } : {}),
          },
        }
      : { valueString: observation.valueText }),
    ...(referenceRange.length > 0 ? { referenceRange } : {}),
    ...(interpretationCode
      ? {
          interpretation: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                  code: interpretationCode,
                },
              ],
            },
          ],
        }
      : {}),
    ...(observation.documentId
      ? { derivedFrom: [{ reference: `DocumentReference/${observation.documentId}` }] }
      : {}),
    ...(observation.notes ? { note: [{ text: observation.notes }] } : {}),
  };
}

export function toFhirDocumentReference(doc: MedicalDocument, profile: HealthProfile): FhirResource {
  return {
    resourceType: "DocumentReference",
    id: doc.id,
    meta: meta(doc.updatedAt, isDemoTitle(doc.title)),
    status: "current",
    type: { text: doc.category.replace(/_/g, " ") },
    category: [{ text: "Medical record" }],
    subject: { reference: `Patient/${profile.id}`, display: profile.name },
    date: doc.createdAt.toISOString(),
    description: doc.title,
    content: [
      {
        attachment: {
          contentType: doc.mime,
          title: doc.originalFilename,
          size: doc.sizeBytes,
          language: "en-IN",
        },
      },
    ],
  };
}

export function toFhirMedicationStatement(med: Medication, profile: HealthProfile): FhirResource {
  return {
    resourceType: "MedicationStatement",
    id: med.id,
    meta: meta(med.updatedAt, false),
    status: med.active ? "active" : "completed",
    medicationCodeableConcept: { text: med.name },
    subject: { reference: `Patient/${profile.id}`, display: profile.name },
    ...(med.startDate ? { effectiveDateTime: `${med.startDate}T00:00:00Z` } : {}),
    dateAsserted: med.createdAt.toISOString(),
    ...(med.dosageText || med.scheduleText
      ? {
          dosage: [
            {
              text: [med.dosageText, med.scheduleText].filter(Boolean).join(" · "),
              ...(med.notes ? { additionalInstruction: [{ text: med.notes }] } : {}),
            },
          ],
        }
      : {}),
    ...(med.notes ? { note: [{ text: med.notes }] } : {}),
  };
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  entry: Array<{ fullUrl: string; resource: FhirResource }>;
}

export function toFhirBundle(args: {
  profile: HealthProfile;
  observations: Observation[];
  medications: Medication[];
  documents: MedicalDocument[];
  baseUrl: string;
}): FhirBundle {
  const { profile, baseUrl } = args;
  const entries: Array<{ fullUrl: string; resource: FhirResource }> = [
    { fullUrl: `${baseUrl}/fhir/Patient/${profile.id}`, resource: toFhirPatient(profile) },
    ...args.documents.map((doc) => ({
      fullUrl: `${baseUrl}/fhir/DocumentReference/${doc.id}`,
      resource: toFhirDocumentReference(doc, profile),
    })),
    ...args.observations.map((obs) => ({
      fullUrl: `${baseUrl}/fhir/Observation/${obs.id}`,
      resource: toFhirObservation(obs, profile),
    })),
    ...args.medications.map((med) => ({
      fullUrl: `${baseUrl}/fhir/MedicationStatement/${med.id}`,
      resource: toFhirMedicationStatement(med, profile),
    })),
  ];
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}
