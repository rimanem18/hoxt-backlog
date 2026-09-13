CREATE TABLE IF NOT EXISTS "app_hoxbl"."viewer_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_viewer_push_subscriptions_email_endpoint" ON "app_hoxbl"."viewer_push_subscriptions" USING btree (lower("email"),"endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_viewer_push_subscriptions_email" ON "app_hoxbl"."viewer_push_subscriptions" USING btree (lower("email"));