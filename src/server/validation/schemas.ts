import { z } from "zod";

/**
 * Server-side input contracts. Every API route parses its body/query through
 * one of these schemas — no unvalidated field reaches the store.
 */

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, "That date does not exist.");

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(256);

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
  acknowledgeDisclaimer: z.literal(true),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: passwordSchema,
});

export const RELATIONS = ["self", "spouse", "child", "parent", "sibling", "grandparent", "other"] as const;
export const SEXES = ["male", "female", "other"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const profileCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    relation: z.enum(RELATIONS),
    dob: isoDate.optional().nullable(),
    sex: z.enum(SEXES).optional().nullable(),
    bloodGroup: z.enum(BLOOD_GROUPS).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    authorizationAffirmed: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.relation !== "self" && value.authorizationAffirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationAffirmed"],
        message: "You must confirm you are authorized to manage this person's records.",
      });
    }
  });

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  relation: z.enum(RELATIONS).optional(),
  dob: isoDate.optional().nullable(),
  sex: z.enum(SEXES).optional().nullable(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  authorizationAffirmed: z.boolean().optional(),
});

export const DOCUMENT_CATEGORIES = [
  "lab_report",
  "prescription",
  "discharge_summary",
  "imaging_report",
  "vaccination",
  "invoice",
  "insurance",
  "other",
] as const;

export const documentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  summary: z.string().max(12000).optional().nullable(),
});

export const documentListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  status: z.enum(["processing", "ready", "needs_review", "failed"]).optional(),
  sort: z.enum(["newest", "oldest", "name"]).optional(),
});

export const OBSERVATION_FLAGS = ["low", "normal", "high", "unknown"] as const;

export const observationCreateSchema = z.object({
  profileId: z.string().uuid(),
  testName: z.string().trim().min(1).max(200),
  valueText: z.string().trim().min(1).max(60),
  valueNumeric: z.number().finite().optional().nullable(),
  unit: z.string().trim().max(40).optional().nullable(),
  refLow: z.number().finite().optional().nullable(),
  refHigh: z.number().finite().optional().nullable(),
  refText: z.string().trim().max(120).optional().nullable(),
  flag: z.enum(OBSERVATION_FLAGS).optional(),
  collectedAt: isoDate.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const observationUpdateSchema = z.object({
  testName: z.string().trim().min(1).max(200).optional(),
  valueText: z.string().trim().min(1).max(60).optional(),
  valueNumeric: z.number().finite().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  refLow: z.number().finite().nullable().optional(),
  refHigh: z.number().finite().nullable().optional(),
  refText: z.string().trim().max(120).nullable().optional(),
  flag: z.enum(OBSERVATION_FLAGS).optional(),
  collectedAt: isoDate.nullable().optional(),
  verified: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const medicationCreateSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  dosageText: z.string().trim().max(120).optional().nullable(),
  scheduleText: z.string().trim().max(200).optional().nullable(),
  startDate: isoDate.optional().nullable(),
  endDate: isoDate.optional().nullable(),
  active: z.boolean().optional(),
  prescriber: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const medicationUpdateSchema = medicationCreateSchema.omit({ profileId: true }).partial();

export const assistantAskSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  conversationId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  locale: z.enum(["en", "hi"]).optional(),
});

export const INTERACTION_CHECK_MAX = 20;

export const interactionCheckSchema = z.object({
  profileId: z.string().uuid(),
  medicationIds: z.array(z.string().uuid()).min(2).max(INTERACTION_CHECK_MAX),
});

export const FEEDBACK_CATEGORIES = ["bug", "feature", "experience", "other"] as const;

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(10).max(5000),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(254).optional().nullable(),
  name: z.string().trim().max(100).optional().nullable(),
});

export const settingsAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: emailSchema.optional(),
  locale: z.enum(["en", "hi"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

export const updateObservationConfirmSchema = z.object({
  observations: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        testName: z.string().trim().min(1).max(200),
        valueText: z.string().trim().min(1).max(60),
        unit: z.string().trim().max(40).nullable().optional(),
        refLow: z.number().finite().nullable().optional(),
        refHigh: z.number().finite().nullable().optional(),
        refText: z.string().trim().max(120).nullable().optional(),
        collectedAt: isoDate.nullable().optional(),
        keep: z.boolean().optional(),
      }),
    )
    .max(200),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10000).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type ObservationCreateInput = z.infer<typeof observationCreateSchema>;
export type MedicationCreateInput = z.infer<typeof medicationCreateSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
