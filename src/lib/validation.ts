import { z } from "zod";

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Please tell us your name").max(60),
  email: z.email("That does not look like an email address").toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  city: z.string().trim().min(2, "Which city are you in?").max(80),
  postalCode: z
    .string()
    .trim()
    .min(4, "Postal code looks too short")
    .max(10),
});

export const loginSchema = z.object({
  email: z.email("That does not look like an email address").toLowerCase(),
  password: z.string().min(1, "Please enter your password"),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(400).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(4).max(10),
  avatarUrl: z.url().optional().or(z.literal("")),
});

const optionalInt = (max: number) =>
  z
    .union([z.coerce.number().int().min(1).max(max), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)));

export const listingSchema = z
  .object({
    type: z.enum(["OFFER", "REQUEST"]),
    kind: z.enum(["PRODUCT", "SERVICE"]),
    categoryId: z.uuid("Please pick a category"),
    title: z.string().trim().min(4, "Give it a clear title").max(90),
    description: z
      .string()
      .trim()
      .min(20, "A few more words help people decide")
      .max(2000),
    pricePoints: z.coerce
      .number()
      .int("Social Points are whole numbers")
      .min(0, "Cannot be negative")
      .max(500, "Keep it under 500 SP for now"),
    priceUnit: z.enum(["TOTAL", "PER_HOUR", "PER_DAY", "PER_WEEKEND", "PER_WEEK"]),
    city: z.string().trim().min(2, "Which city?").max(80),
    postalCode: z.string().trim().min(4).max(10),
    availability: z.string().trim().max(120).optional().or(z.literal("")),
    tags: z.string().trim().max(200).optional().or(z.literal("")),
    imageUrl: z.union([z.url(), z.literal("")]).optional(),

    loanDurationDays: optionalInt(365),
    handover: z.enum(["PICKUP", "DELIVERY", "BOTH"]).optional().or(z.literal("")),
    condition: z
      .enum(["NEW", "GOOD", "USED", "WELL_LOVED"])
      .optional()
      .or(z.literal("")),

    estimatedMinutes: optionalInt(10080),
    presence: z
      .enum(["IN_PERSON", "REMOTE", "EITHER"])
      .optional()
      .or(z.literal("")),
  })
  .transform((v) => ({
    ...v,
    availability: v.availability || null,
    imageUrl: v.imageUrl || null,
    handover: v.kind === "PRODUCT" ? (v.handover || "PICKUP") : null,
    condition: v.kind === "PRODUCT" ? (v.condition || null) : null,
    presence: v.kind === "SERVICE" ? (v.presence || "IN_PERSON") : null,
    loanDurationDays: v.kind === "PRODUCT" ? v.loanDurationDays : null,
    estimatedMinutes: v.kind === "SERVICE" ? v.estimatedMinutes : null,
    tagList: (v.tags ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8),
  }));

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(2000),
});

export const swapRequestSchema = z.object({
  listingId: z.uuid(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  scheduledFor: z.string().trim().max(120).optional().or(z.literal("")),
});

export const reviewSchema = z.object({
  swapId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(600).optional().or(z.literal("")),
});

export const reportSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "MESSAGE"]),
  targetId: z.uuid(),
  reason: z.enum([
    "SPAM",
    "FRAUD",
    "UNSAFE",
    "INAPPROPRIATE",
    "INCORRECT_INFORMATION",
    "OTHER",
  ]),
  details: z.string().trim().max(600).optional().or(z.literal("")),
});

export const feedbackSchema = z.object({
  type: z.enum(["IDEA", "BUG", "FEEDBACK"]),
  message: z.string().trim().min(5, "Tell us a little more").max(2000),
});
