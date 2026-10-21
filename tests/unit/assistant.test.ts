import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/server/db/memory-store";
import {
  answerHealthQuestion,
  buildDeterministicAnswer,
  extractCitations,
  needsEmergencyGuidance,
  retrieveAssistantContext,
} from "@/server/ai/assistant";
import type { HealthProfile, User } from "@/types/domain";

let store: MemoryStore;
let user: User;
let selfProfile: HealthProfile;
let otherProfile: HealthProfile;
let docAId: string;

beforeEach(async () => {
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("OPENAI_API_KEY", ""); // force deterministic mode
  store = new MemoryStore();
  await store.init();
  user = await store.createUser({ email: "assistant@example.com", name: "Asha", passwordHash: "scrypt$x" });
  selfProfile = await store.createProfile({ ownerId: user.id, name: "Asha", relation: "self" });
  otherProfile = await store.createProfile({ ownerId: user.id, name: "Mother", relation: "parent" });

  const doc = await store.createDocument({
    userId: user.id,
    profileId: selfProfile.id,
    title: "Lipid Profile",
    originalFilename: "lipid.pdf",
    mime: "application/pdf",
    sizeBytes: 100,
    category: "lab_report",
    status: "ready",
  });
  docAId = doc.id;
  await store.saveDocumentText({
    documentId: doc.id,
    text: "Total Cholesterol 212 mg/dL Desirable: < 200",
    engine: "pdf_text",
    confidence: 0.99,
  });
  await store.createObservation({
    userId: user.id,
    profileId: selfProfile.id,
    documentId: doc.id,
    testName: "Total Cholesterol",
    valueText: "212",
    valueNumeric: 212,
    unit: "mg/dL",
    refHigh: 200,
    refText: "Desirable: < 200 mg/dL",
    flag: "high",
    collectedAt: "2025-03-14",
    verified: true,
  });

  const otherDoc = await store.createDocument({
    userId: user.id,
    profileId: otherProfile.id,
    title: "Mother's Thyroid Panel",
    originalFilename: "thyroid.pdf",
    mime: "application/pdf",
    sizeBytes: 100,
    category: "lab_report",
    status: "ready",
  });
  await store.createObservation({
    userId: user.id,
    profileId: otherProfile.id,
    documentId: otherDoc.id,
    testName: "TSH",
    valueText: "9.1",
    valueNumeric: 9.1,
    unit: "uIU/mL",
    flag: "high",
    verified: true,
  });
});

describe("retrieval and grounding", () => {
  it("retrieves only the selected profile's records", async () => {
    const context = await retrieveAssistantContext(store, user.id, selfProfile, "cholesterol");
    expect(context.hasRecords).toBe(true);
    const joined = context.sources.map((s) => s.label).join(" | ");
    expect(joined).toContain("Total Cholesterol");
    expect(joined).not.toContain("Thyroid");
    expect(joined).not.toContain("TSH");
  });

  it("reports no records for an empty profile", async () => {
    const empty = await store.createProfile({ ownerId: user.id, name: "Empty", relation: "child" });
    const context = await retrieveAssistantContext(store, user.id, empty, "anything");
    expect(context.hasRecords).toBe(false);
    expect(context.sources).toHaveLength(0);
  });

  it("maps only real citation tags and drops invented ones", () => {
    const sources = [
      { tag: "S1", kind: "document" as const, id: docAId, label: "Lipid Profile", detail: "2025-03-14", content: "" },
    ];
    const citations = extractCitations("Cholesterol was high [S1]. Invented fact [S9]. Again [S1].", sources);
    expect(citations).toHaveLength(1);
    expect(citations[0]!.id).toBe(docAId);
    expect(citations[0]!.kind).toBe("document");
  });

  it("builds a deterministic, clearly-labeled answer without AI", async () => {
    const context = await retrieveAssistantContext(store, user.id, selfProfile, "cholesterol");
    const answer = buildDeterministicAnswer(context, context.sources, "en");
    expect(answer).toMatch(/AI provider is not configured/i);
    expect(answer).toContain("Total Cholesterol");
    expect(answer).toMatch(/not medical advice/i);
  });

  it("answers through answerHealthQuestion without an AI provider", async () => {
    const result = await answerHealthQuestion({
      store,
      user,
      profile: selfProfile,
      question: "What was my cholesterol?",
      locale: "en",
      history: [],
    });
    expect(result.provider).toBeNull();
    expect(result.grounded).toBe(true);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.content).toContain("Total Cholesterol");
  });

  it("returns an honest no-context answer for empty profiles", async () => {
    const empty = await store.createProfile({ ownerId: user.id, name: "Empty", relation: "child" });
    const result = await answerHealthQuestion({
      store,
      user,
      profile: empty,
      question: "What does my report say?",
      locale: "en",
      history: [],
    });
    expect(result.grounded).toBe(false);
    expect(result.citations).toHaveLength(0);
    expect(result.content).toMatch(/don't have any records/i);
  });

  it("localizes deterministic answers into Hindi", async () => {
    const context = await retrieveAssistantContext(store, user.id, selfProfile, "कोलेस्ट्रॉल");
    const answer = buildDeterministicAnswer(context, context.sources, "hi");
    expect(answer).toContain("AI प्रदाता");
  });

  it("detects emergency language in English and Hindi", () => {
    expect(needsEmergencyGuidance("I have severe chest pain right now")).toBe(true);
    expect(needsEmergencyGuidance("सीने में दर्द हो रहा है")).toBe(true);
    expect(needsEmergencyGuidance("What does my cholesterol mean?")).toBe(false);
  });

  it("prefixes emergency guidance when the question signals an emergency", async () => {
    const result = await answerHealthQuestion({
      store,
      user,
      profile: selfProfile,
      question: "I have chest pain and can't breathe",
      locale: "en",
      history: [],
    });
    expect(result.content).toMatch(/^⚠️/);
    expect(result.content).toMatch(/emergency/i);
    expect(result.content).toContain("Total Cholesterol"); // still answers with records
  });
});
