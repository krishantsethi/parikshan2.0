import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/server/db/memory-store";

/**
 * The memory store is the demo driver, but it implements the exact same
 * contract as Postgres — these tests pin down ownership scoping, ordering,
 * cascades, and expiry semantics that the app relies on in both drivers.
 */

let store: MemoryStore;

beforeEach(async () => {
  vi.stubEnv("DEMO_MODE", "false"); // no seeded demo data in tests
  store = new MemoryStore();
  await store.init();
});

async function makeUser(email = "a@example.com") {
  return store.createUser({ email, name: "User A", passwordHash: "scrypt$x" });
}

describe("users and sessions", () => {
  it("normalizes email lookup", async () => {
    const user = await makeUser("Mixed@Example.COM");
    expect((await store.getUserByEmail("mixed@example.com"))?.id).toBe(user.id);
    expect(await store.getUserByEmail("missing@example.com")).toBeNull();
  });

  it("expires sessions server-side and removes the row", async () => {
    const user = await makeUser();
    const expired = await store.createSession({
      userId: user.id,
      tokenHash: "expired-hash",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await store.getSessionByTokenHash("expired-hash")).toBeNull();
    expect(await store.deleteExpiredSessions()).toBe(0); // already cleaned on lookup
    void expired;

    const live = await store.createSession({
      userId: user.id,
      tokenHash: "live-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect((await store.getSessionByTokenHash("live-hash"))?.id).toBe(live.id);
    await store.deleteSessionsForUser(user.id);
    expect(await store.getSessionByTokenHash("live-hash")).toBeNull();
  });

  it("invalidates reset tokens after use", async () => {
    const user = await makeUser();
    const token = await store.createPasswordResetToken(user.id, "reset-hash", new Date(Date.now() + 60_000));
    expect(await store.getValidPasswordResetToken("reset-hash")).not.toBeNull();
    await store.consumePasswordResetToken(token.id);
    expect(await store.getValidPasswordResetToken("reset-hash")).toBeNull();
  });
});

describe("profiles and ownership scoping", () => {
  it("makes the first profile primary and scopes listing by owner", async () => {
    const a = await makeUser("a@example.com");
    const b = await makeUser("b@example.com");
    const first = await store.createProfile({ ownerId: a.id, name: "Aarav", relation: "self" });
    const second = await store.createProfile({ ownerId: a.id, name: "Mother", relation: "parent" });
    await store.createProfile({ ownerId: b.id, name: "Other", relation: "self" });

    expect(first.isPrimary).toBe(true);
    expect(second.isPrimary).toBe(false);
    const aProfiles = await store.listProfiles(a.id);
    expect(aProfiles).toHaveLength(2);
    expect(aProfiles[0]!.id).toBe(first.id);
    expect((await store.listProfiles(b.id))[0]!.name).toBe("Other");
  });

  it("cascades profile deletion to its records only", async () => {
    const user = await makeUser();
    const keep = await store.createProfile({ ownerId: user.id, name: "Keep", relation: "self" });
    const drop = await store.createProfile({ ownerId: user.id, name: "Drop", relation: "child" });

    const doc = await store.createDocument({
      userId: user.id,
      profileId: drop.id,
      title: "Drop doc",
      originalFilename: "d.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    });
    await store.saveFile(doc.id, "application/pdf", new Uint8Array([1, 2, 3]));
    await store.saveDocumentText({ documentId: doc.id, text: "text", engine: "pdf_text", confidence: 1 });
    await store.createObservation({
      userId: user.id,
      profileId: drop.id,
      testName: "Hb",
      valueText: "12",
      documentId: doc.id,
    });
    await store.createMedication({ userId: user.id, profileId: drop.id, name: "Med" });
    const conv = await store.createConversation({
      userId: user.id,
      profileId: drop.id,
      title: "chat",
      locale: "en",
    });
    await store.createMessage({ conversationId: conv.id, role: "user", content: "hi" });

    const keepDoc = await store.createDocument({
      userId: user.id,
      profileId: keep.id,
      title: "Keep doc",
      originalFilename: "k.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    });

    await store.deleteProfile(drop.id);

    expect(await store.getProfile(drop.id)).toBeNull();
    expect(await store.getDocument(doc.id)).toBeNull();
    expect(await store.getFile(doc.id)).toBeNull();
    expect(await store.getDocumentText(doc.id)).toBeNull();
    expect(await store.listObservations({ userId: user.id, profileId: drop.id })).toHaveLength(0);
    expect(await store.listMedications({ userId: user.id, profileId: drop.id })).toHaveLength(0);
    expect(await store.getConversation(conv.id)).toBeNull();
    expect((await store.listDocuments({ userId: user.id })).items.map((d) => d.id)).toEqual([keepDoc.id]);
  });

  it("cascades account deletion across every entity", async () => {
    const user = await makeUser();
    const profile = await store.createProfile({ ownerId: user.id, name: "Self", relation: "self" });
    const doc = await store.createDocument({
      userId: user.id,
      profileId: profile.id,
      title: "doc",
      originalFilename: "d.pdf",
      mime: "application/pdf",
      sizeBytes: 1,
    });
    await store.logAudit({ userId: user.id, action: "signup" });
    await store.deleteUser(user.id);

    expect(await store.getUserById(user.id)).toBeNull();
    expect(await store.getProfile(profile.id)).toBeNull();
    expect(await store.getDocument(doc.id)).toBeNull();
    expect(await store.listAudit(user.id)).toHaveLength(0);
  });
});

describe("documents", () => {
  it("filters by profile, category, status, search and sorts", async () => {
    const user = await makeUser();
    const p1 = await store.createProfile({ ownerId: user.id, name: "P1", relation: "self" });
    const p2 = await store.createProfile({ ownerId: user.id, name: "P2", relation: "parent" });

    const a = await store.createDocument({
      userId: user.id,
      profileId: p1.id,
      title: "Lipid Panel",
      originalFilename: "lipid.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
      category: "lab_report",
      status: "ready",
    });
    const b = await store.createDocument({
      userId: user.id,
      profileId: p1.id,
      title: "Prescription",
      originalFilename: "rx.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
      category: "prescription",
      status: "needs_review",
    });
    await store.createDocument({
      userId: user.id,
      profileId: p2.id,
      title: "Other profile doc",
      originalFilename: "o.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    });

    expect((await store.listDocuments({ userId: user.id, profileId: p1.id })).total).toBe(2);
    expect((await store.listDocuments({ userId: user.id, profileId: p1.id, category: "lab_report" })).items[0]!.id).toBe(a.id);
    expect((await store.listDocuments({ userId: user.id, profileId: p1.id, status: "needs_review" })).items[0]!.id).toBe(b.id);
    expect((await store.listDocuments({ userId: user.id, profileId: p1.id, search: "lipid" })).total).toBe(1);
    expect((await store.listDocuments({ userId: user.id, profileId: p1.id, sort: "name" })).items[0]!.title).toBe("Lipid Panel");
    expect((await store.listDocuments({ userId: user.id, profileId: p1.id, limit: 1, offset: 1 })).items).toHaveLength(1);
  });

  it("replaces document observations atomically", async () => {
    const user = await makeUser();
    const profile = await store.createProfile({ ownerId: user.id, name: "P", relation: "self" });
    const doc = await store.createDocument({
      userId: user.id,
      profileId: profile.id,
      title: "doc",
      originalFilename: "d.pdf",
      mime: "application/pdf",
      sizeBytes: 1,
    });
    await store.createObservation({
      userId: user.id,
      profileId: profile.id,
      documentId: doc.id,
      testName: "Old",
      valueText: "1",
    });
    const replaced = await store.replaceDocumentObservations(doc.id, [
      {
        userId: user.id,
        profileId: profile.id,
        testName: "New",
        valueText: "2",
        verified: true,
        source: "reviewed",
      },
    ]);
    expect(replaced).toHaveLength(1);
    const listed = await store.listObservations({ userId: user.id, documentId: doc.id });
    expect(listed.map((o) => o.testName)).toEqual(["New"]);
    expect(listed[0]!.verified).toBe(true);
  });

  it("filters verified-only observations and sorts newest first", async () => {
    const user = await makeUser();
    const profile = await store.createProfile({ ownerId: user.id, name: "P", relation: "self" });
    await store.createObservation({
      userId: user.id,
      profileId: profile.id,
      testName: "Hb",
      valueText: "12",
      collectedAt: "2024-01-01",
      verified: true,
    });
    await store.createObservation({
      userId: user.id,
      profileId: profile.id,
      testName: "Hb",
      valueText: "13",
      collectedAt: "2025-01-01",
      verified: true,
    });
    await store.createObservation({
      userId: user.id,
      profileId: profile.id,
      testName: "Hb",
      valueText: "14",
      collectedAt: "2025-06-01",
      verified: false,
    });

    const verified = await store.listObservations({ userId: user.id, verifiedOnly: true });
    expect(verified.map((o) => o.valueText)).toEqual(["13", "12"]);
    const names = await store.listTestNames(user.id, profile.id);
    expect(names).toEqual(["Hb"]);
  });
});

describe("assistant conversations and stats", () => {
  it("orders messages chronologically and deletes conversations with messages", async () => {
    const user = await makeUser();
    const profile = await store.createProfile({ ownerId: user.id, name: "P", relation: "self" });
    const conversation = await store.createConversation({
      userId: user.id,
      profileId: profile.id,
      title: "Hello",
      locale: "en",
    });
    await store.createMessage({ conversationId: conversation.id, role: "user", content: "q1" });
    await store.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "a1",
      citations: [{ kind: "document", id: "d1", label: "Doc", detail: null }],
      grounded: true,
    });
    const messages = await store.listMessages(conversation.id);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.citations[0]!.label).toBe("Doc");

    await store.deleteConversation(conversation.id);
    expect(await store.getConversation(conversation.id)).toBeNull();
    expect(await store.listMessages(conversation.id)).toHaveLength(0);
  });

  it("computes dashboard stats scoped to a profile", async () => {
    const user = await makeUser();
    const p1 = await store.createProfile({ ownerId: user.id, name: "P1", relation: "self" });
    const p2 = await store.createProfile({ ownerId: user.id, name: "P2", relation: "parent" });
    await store.createDocument({
      userId: user.id,
      profileId: p1.id,
      title: "d",
      originalFilename: "d.pdf",
      mime: "application/pdf",
      sizeBytes: 1,
    });
    await store.createMedication({ userId: user.id, profileId: p1.id, name: "active" });
    await store.createMedication({ userId: user.id, profileId: p1.id, name: "stopped", active: false });
    await store.createMedication({ userId: user.id, profileId: p2.id, name: "other" });

    const stats = await store.getDashboardStats(user.id, p1.id);
    expect(stats.documentCount).toBe(1);
    expect(stats.medicationCount).toBe(1);
    expect(stats.recentDocuments).toHaveLength(1);
  });

  it("orders audit events newest first and respects limits", async () => {
    const user = await makeUser();
    await store.logAudit({ userId: user.id, action: "one" });
    await store.logAudit({ userId: user.id, action: "two" });
    const audit = await store.listAudit(user.id, 1);
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe("two");
  });
});
