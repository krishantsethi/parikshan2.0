import { redirect } from "next/navigation";
import { getStore } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import type { HealthProfile, MedicalDocument, User } from "@/types/domain";

/** Error with an HTTP status for API routes. Messages are safe to show users. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "error",
  ) {
    super(message);
  }
}

/** For API route handlers: 401 when anonymous. */
export async function requireUserApi(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.", "unauthorized");
  return user;
}

/** For pages: redirect to /login when anonymous. */
export async function requireUserPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Ownership check for profiles. Returns the profile or 404 — deliberately
 * identical to "does not exist" so record existence is never leaked.
 */
export async function requireOwnedProfile(userId: string, profileId: string): Promise<HealthProfile> {
  const store = await getStore();
  const profile = await store.getProfile(profileId);
  if (!profile || profile.ownerId !== userId) {
    throw new ApiError(404, "Profile not found.", "not_found");
  }
  return profile;
}

export async function requireOwnedDocument(userId: string, documentId: string): Promise<MedicalDocument> {
  const store = await getStore();
  const doc = await store.getDocument(documentId);
  if (!doc || doc.userId !== userId) {
    throw new ApiError(404, "Document not found.", "not_found");
  }
  return doc;
}

/** Resolve the profile to act on: explicit id (ownership-checked) or the primary. */
export async function resolveActorProfile(userId: string, requestedProfileId?: string | null): Promise<HealthProfile> {
  const store = await getStore();
  if (requestedProfileId) return requireOwnedProfile(userId, requestedProfileId);
  const profiles = await store.listProfiles(userId);
  const primary = profiles.find((p) => p.isPrimary) ?? profiles[0];
  if (!primary) throw new ApiError(409, "No health profile exists yet. Complete onboarding first.", "no_profile");
  return primary;
}
