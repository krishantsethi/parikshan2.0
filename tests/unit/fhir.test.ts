import { describe, expect, it } from "vitest";
import {
  toFhirBundle,
  toFhirDocumentReference,
  toFhirMedicationStatement,
  toFhirObservation,
  toFhirPatient,
} from "@/server/interop/fhir";
import type { HealthProfile, MedicalDocument, Medication, Observation } from "@/types/domain";

const profile: HealthProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  ownerId: "99999999-9999-4999-8999-999999999999",
  name: "Test Patient",
  relation: "self",
  dob: "1990-01-01",
  sex: "male",
  bloodGroup: "B+",
  notes: null,
  authorizationAffirmedAt: null,
  isPrimary: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

const observation: Observation = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: profile.ownerId,
  profileId: profile.id,
  documentId: "33333333-3333-4333-8333-333333333333",
  testName: "Hemoglobin",
  valueText: "12.8",
  valueNumeric: 12.8,
  unit: "g/dL",
  refLow: 13,
  refHigh: 17,
  refText: "13.0 - 17.0 g/dL",
  flag: "low",
  collectedAt: "2025-03-14",
  source: "document_extraction",
  confidence: 0.9,
  verified: false,
  notes: "As printed: Haemoglobin",
  createdAt: new Date("2025-03-15T00:00:00Z"),
  updatedAt: new Date("2025-03-15T00:00:00Z"),
};

const document: MedicalDocument = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: profile.ownerId,
  profileId: profile.id,
  title: "SAMPLE — CBC",
  originalFilename: "cbc.pdf",
  mime: "application/pdf",
  sizeBytes: 1234,
  category: "lab_report",
  status: "needs_review",
  errorMessage: null,
  ocrEngine: "pdf_text",
  textConfidence: 0.99,
  pages: 1,
  textLength: 400,
  summary: null,
  summaryKind: null,
  createdAt: new Date("2025-03-15T00:00:00Z"),
  updatedAt: new Date("2025-03-15T00:00:00Z"),
};

const medication: Medication = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: profile.ownerId,
  profileId: profile.id,
  name: "Metformin",
  dosageText: "500 mg",
  scheduleText: "1-0-1",
  startDate: "2025-01-01",
  endDate: null,
  active: true,
  prescriber: null,
  notes: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

describe("FHIR mapping", () => {
  it("maps a patient with identifier, gender and birth date", () => {
    const patient = toFhirPatient(profile);
    expect(patient.resourceType).toBe("Patient");
    expect(patient.id).toBe(profile.id);
    expect(patient.gender).toBe("male");
    expect(patient.birthDate).toBe("1990-01-01");
    expect(patient.identifier).toEqual([
      { system: "https://parikshan.health/profile-id", value: profile.id },
    ]);
  });

  it("maps an observation to a laboratory resource with range and interpretation", () => {
    const resource = toFhirObservation(observation, profile);
    expect(resource.resourceType).toBe("Observation");
    // Unverified extractions must be preliminary
    expect(resource.status).toBe("preliminary");
    expect(resource.code).toEqual({ text: "Hemoglobin" });
    expect(resource.valueQuantity).toEqual({ value: 12.8, unit: "g/dL" });
    expect(resource.referenceRange).toEqual([
      { low: { value: 13, unit: "g/dL" }, high: { value: 17, unit: "g/dL" }, text: "13.0 - 17.0 g/dL" },
    ]);
    expect((resource.interpretation as Array<{ coding: Array<{ code: string }> }>)[0]!.coding[0]!.code).toBe("L");
    expect(resource.derivedFrom).toEqual([{ reference: `DocumentReference/${observation.documentId}` }]);
  });

  it("marks verified observations as final and flags demo documents", () => {
    const final = toFhirObservation({ ...observation, verified: true }, profile);
    expect(final.status).toBe("final");
    const doc = toFhirDocumentReference(document, profile);
    expect(doc.resourceType).toBe("DocumentReference");
    const tags = (doc.meta as { tag: Array<{ code: string }> }).tag;
    expect(tags.some((tag) => tag.code === "demo")).toBe(true);
  });

  it("maps medication statements with dosage text", () => {
    const statement = toFhirMedicationStatement(medication, profile);
    expect(statement.status).toBe("active");
    expect(statement.medicationCodeableConcept).toEqual({ text: "Metformin" });
    expect((statement.dosage as Array<{ text: string }>)[0]!.text).toBe("500 mg · 1-0-1");
  });

  it("assembles a collection bundle with all resources", () => {
    const bundle = toFhirBundle({
      profile,
      observations: [observation],
      medications: [medication],
      documents: [document],
      baseUrl: "https://example.test",
    });
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    expect(bundle.entry).toHaveLength(4);
    expect(bundle.entry[0]!.fullUrl).toContain("/fhir/Patient/");
    expect(new Set(bundle.entry.map((entry) => entry.resource.resourceType))).toEqual(
      new Set(["Patient", "Observation", "MedicationStatement", "DocumentReference"]),
    );
  });
});
