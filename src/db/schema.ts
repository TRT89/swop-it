import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const userRole = pgEnum("user_role", ["MEMBER", "ADMIN"]);

export const listingType = pgEnum("listing_type", ["OFFER", "REQUEST"]);
export const listingKind = pgEnum("listing_kind", ["PRODUCT", "SERVICE"]);
export const listingStatus = pgEnum("listing_status", [
  "ACTIVE",
  "PAUSED",
  "DEACTIVATED",
]);
export const priceUnit = pgEnum("price_unit", [
  "TOTAL",
  "PER_HOUR",
  "PER_DAY",
  "PER_WEEKEND",
  "PER_WEEK",
]);
export const handoverMode = pgEnum("handover_mode", [
  "PICKUP",
  "DELIVERY",
  "BOTH",
]);
export const itemCondition = pgEnum("item_condition", [
  "NEW",
  "GOOD",
  "USED",
  "WELL_LOVED",
]);
export const servicePresence = pgEnum("service_presence", [
  "IN_PERSON",
  "REMOTE",
  "EITHER",
]);

export const swapStatus = pgEnum("swap_status", [
  "REQUESTED",
  "ACCEPTED",
  "ACTIVE",
  "COMPLETION_PENDING",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
]);

export const walletTxType = pgEnum("wallet_tx_type", [
  "WELCOME_BONUS",
  "SWAP_EARNED",
  "SWAP_SPENT",
  "BONUS",
  "ADMIN_ADJUSTMENT",
]);

export const notificationType = pgEnum("notification_type", [
  "MESSAGE",
  "SWAP_REQUESTED",
  "SWAP_ACCEPTED",
  "SWAP_DECLINED",
  "SWAP_COMPLETION_REQUESTED",
  "SWAP_COMPLETED",
  "SWAP_CANCELLED",
  "POINTS_RECEIVED",
  "REVIEW_RECEIVED",
  "BADGE_EARNED",
  "SWOPPY_ADDED",
]);

export const reportTargetType = pgEnum("report_target_type", [
  "LISTING",
  "USER",
  "MESSAGE",
]);
export const reportReason = pgEnum("report_reason", [
  "SPAM",
  "FRAUD",
  "UNSAFE",
  "INAPPROPRIATE",
  "INCORRECT_INFORMATION",
  "OTHER",
]);
export const reportStatus = pgEnum("report_status", [
  "OPEN",
  "REVIEWED",
  "DISMISSED",
]);

export const feedbackType = pgEnum("feedback_type", ["IDEA", "BUG", "FEEDBACK"]);

/* ------------------------------------------------------------- identities */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  role: userRole("role").notNull().default("MEMBER"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  // Kept nullable so the app also works with city/postal code only.
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------- categories */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: listingKind("kind").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_kind_idx").on(t.kind)],
);

/* --------------------------------------------------------------- listings */

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: listingType("type").notNull(),
    kind: listingKind("kind").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    pricePoints: integer("price_points").notNull(),
    priceUnit: priceUnit("price_unit").notNull().default("TOTAL"),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    availability: text("availability"),
    tags: text("tags").array().notNull().default([]),
    status: listingStatus("status").notNull().default("ACTIVE"),

    // product-only
    loanDurationDays: integer("loan_duration_days"),
    handover: handoverMode("handover"),
    condition: itemCondition("condition"),

    // service-only
    estimatedMinutes: integer("estimated_minutes"),
    presence: servicePresence("presence"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("listings_owner_idx").on(t.ownerId),
    index("listings_category_idx").on(t.categoryId),
    index("listings_status_idx").on(t.status),
    index("listings_created_idx").on(t.createdAt),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("listing_images_listing_idx").on(t.listingId)],
);

/* ------------------------------------------------------------ messaging */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("conversations_last_message_idx").on(t.lastMessageAt)],
);

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_members_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

/* ------------------------------------------------------------------ swaps */

export const swaps = pgTable(
  "swaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    // provider earns the Social Points, requester spends them.
    providerId: uuid("provider_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    points: integer("points").notNull(),
    status: swapStatus("status").notNull().default("REQUESTED"),
    note: text("note"),
    scheduledFor: text("scheduled_for"),
    providerConfirmedAt: timestamp("provider_confirmed_at", {
      withTimezone: true,
    }),
    requesterConfirmedAt: timestamp("requester_confirmed_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("swaps_listing_idx").on(t.listingId),
    index("swaps_provider_idx").on(t.providerId),
    index("swaps_requester_idx").on(t.requesterId),
    index("swaps_status_idx").on(t.status),
  ],
);

/* ---------------------------------------------------------------- wallets */

/**
 * `balance` is a cached roll-up of wallet_transactions. It is only ever written
 * inside the same database transaction that inserts the matching ledger rows
 * (see src/lib/points.ts). Never update it on its own.
 */
export const wallets = pgTable(
  "wallets",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
  },
  (t) => [
    // Last line of defence: nobody can ever be pushed below zero Social Points.
    check("wallets_balance_non_negative", sql`${t.balance} >= 0`),
  ],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    swapId: uuid("swap_id").references(() => swaps.id, { onDelete: "set null" }),
    type: walletTxType("type").notNull(),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("wallet_tx_user_idx").on(t.userId, t.createdAt),
    // Hard guarantee: a swap can never pay out twice for the same side.
    uniqueIndex("wallet_tx_swap_side_uniq").on(t.swapId, t.userId, t.type),
  ],
);

/* --------------------------------------------------------------- reviews */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    swapId: uuid("swap_id")
      .notNull()
      .references(() => swaps.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_swap_author_uniq").on(t.swapId, t.authorId),
    index("reviews_subject_idx").on(t.subjectId),
  ],
);

/* -------------------------------------------------------------- swoppies */

export const swoppies = pgTable(
  "swoppies",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    swoppyId: uuid("swoppy_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.swoppyId] }),
    index("swoppies_swoppy_idx").on(t.swoppyId),
  ],
);

/* --------------------------------------------------------- notifications */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/* --------------------------------------------------------------- reports */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: reportReason("reason").notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status)],
);

/* ---------------------------------------------------------------- badges */

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull(),
  swapThreshold: integer("swap_threshold").notNull(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

/* -------------------------------------------------------------- feedback */

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  type: feedbackType("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
