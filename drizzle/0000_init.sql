CREATE TYPE "public"."feedback_type" AS ENUM('IDEA', 'BUG', 'FEEDBACK');--> statement-breakpoint
CREATE TYPE "public"."handover_mode" AS ENUM('PICKUP', 'DELIVERY', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('NEW', 'GOOD', 'USED', 'WELL_LOVED');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('PRODUCT', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('ACTIVE', 'PAUSED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('OFFER', 'REQUEST');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('MESSAGE', 'SWAP_REQUESTED', 'SWAP_ACCEPTED', 'SWAP_DECLINED', 'SWAP_COMPLETION_REQUESTED', 'SWAP_COMPLETED', 'SWAP_CANCELLED', 'POINTS_RECEIVED', 'REVIEW_RECEIVED', 'BADGE_EARNED', 'SWOPPY_ADDED');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('TOTAL', 'PER_HOUR', 'PER_DAY', 'PER_WEEKEND', 'PER_WEEK');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('SPAM', 'FRAUD', 'UNSAFE', 'INAPPROPRIATE', 'INCORRECT_INFORMATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('LISTING', 'USER', 'MESSAGE');--> statement-breakpoint
CREATE TYPE "public"."service_presence" AS ENUM('IN_PERSON', 'REMOTE', 'EITHER');--> statement-breakpoint
CREATE TYPE "public"."swap_status" AS ENUM('REQUESTED', 'ACCEPTED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('MEMBER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('WELCOME_BONUS', 'SWAP_EARNED', 'SWAP_SPENT', 'BONUS', 'ADMIN_ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"emoji" text NOT NULL,
	"swap_threshold" integer NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversation_members" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone,
	CONSTRAINT "conversation_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "feedback_type" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" "listing_type" NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price_points" integer NOT NULL,
	"price_unit" "price_unit" DEFAULT 'TOTAL' NOT NULL,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"availability" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" "listing_status" DEFAULT 'ACTIVE' NOT NULL,
	"loan_duration_days" integer,
	"handover" "handover_mode",
	"condition" "item_condition",
	"estimated_minutes" integer,
	"presence" "service_presence",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swap_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"conversation_id" uuid,
	"points" integer NOT NULL,
	"status" "swap_status" DEFAULT 'REQUESTED' NOT NULL,
	"note" text,
	"scheduled_for" text,
	"provider_confirmed_at" timestamp with time zone,
	"requester_confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swoppies" (
	"user_id" uuid NOT NULL,
	"swoppy_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swoppies_user_id_swoppy_id_pk" PRIMARY KEY("user_id","swoppy_id")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'MEMBER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"swap_id" uuid,
	"type" "wallet_tx_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_swap_id_swaps_id_fk" FOREIGN KEY ("swap_id") REFERENCES "public"."swaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swoppies" ADD CONSTRAINT "swoppies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swoppies" ADD CONSTRAINT "swoppies_swoppy_id_users_id_fk" FOREIGN KEY ("swoppy_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_swap_id_swaps_id_fk" FOREIGN KEY ("swap_id") REFERENCES "public"."swaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_kind_idx" ON "categories" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "conversation_members_user_idx" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "listing_images_listing_idx" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_owner_idx" ON "listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_created_idx" ON "listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_swap_author_uniq" ON "reviews" USING btree ("swap_id","author_id");--> statement-breakpoint
CREATE INDEX "reviews_subject_idx" ON "reviews" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swaps_listing_idx" ON "swaps" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "swaps_provider_idx" ON "swaps" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "swaps_requester_idx" ON "swaps" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "swaps_status_idx" ON "swaps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "swoppies_swoppy_idx" ON "swoppies" USING btree ("swoppy_id");--> statement-breakpoint
CREATE INDEX "wallet_tx_user_idx" ON "wallet_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_tx_swap_side_uniq" ON "wallet_transactions" USING btree ("swap_id","user_id","type");