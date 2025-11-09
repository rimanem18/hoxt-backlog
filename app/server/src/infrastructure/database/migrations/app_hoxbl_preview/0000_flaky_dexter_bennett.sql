CREATE TYPE "app_hoxbl_preview"."auth_provider_type" AS ENUM('google', 'apple', 'microsoft', 'github', 'facebook', 'line');--> statement-breakpoint
CREATE TABLE "app_hoxbl_preview"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_priority" CHECK ("app_hoxbl_preview"."tasks"."priority" IN ('high', 'medium', 'low')),
	CONSTRAINT "valid_status" CHECK ("app_hoxbl_preview"."tasks"."status" IN ('not_started', 'in_progress', 'in_review', 'completed')),
	CONSTRAINT "non_empty_title" CHECK (length(trim("app_hoxbl_preview"."tasks"."title")) > 0),
	CONSTRAINT "title_length" CHECK (length("app_hoxbl_preview"."tasks"."title") <= 100)
);
--> statement-breakpoint
CREATE TABLE "app_hoxbl_preview"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"provider" "app_hoxbl_preview"."auth_provider_type" NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "valid_email" CHECK ("app_hoxbl_preview"."users"."email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$'),
	CONSTRAINT "non_empty_name" CHECK (length(trim("app_hoxbl_preview"."users"."name")) > 0),
	CONSTRAINT "valid_avatar_url" CHECK ("app_hoxbl_preview"."users"."avatar_url" IS NULL OR "app_hoxbl_preview"."users"."avatar_url" ~* '^https?://')
);
--> statement-breakpoint
ALTER TABLE "app_hoxbl_preview"."tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_hoxbl_preview"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id" ON "app_hoxbl_preview"."tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_at" ON "app_hoxbl_preview"."tasks" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "app_hoxbl_preview"."tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "app_hoxbl_preview"."tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_created" ON "app_hoxbl_preview"."tasks" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_tasks_user_priority" ON "app_hoxbl_preview"."tasks" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_status" ON "app_hoxbl_preview"."tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_external_id_provider" ON "app_hoxbl_preview"."users" USING btree ("external_id","provider");--> statement-breakpoint
CREATE INDEX "idx_users_external_id_provider" ON "app_hoxbl_preview"."users" USING btree ("external_id","provider");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "app_hoxbl_preview"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_last_login_at" ON "app_hoxbl_preview"."users" USING btree ("last_login_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_users_provider_created_at" ON "app_hoxbl_preview"."users" USING btree ("provider","created_at" DESC NULLS LAST);