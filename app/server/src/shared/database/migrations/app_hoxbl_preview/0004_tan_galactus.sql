CREATE TYPE "app_hoxbl_preview"."viewer_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "app_hoxbl_preview"."project_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "app_hoxbl_preview"."viewer_status" DEFAULT 'active' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_viewer_email" CHECK ("app_hoxbl_preview"."project_viewers"."email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$')
);
--> statement-breakpoint
CREATE TABLE "app_hoxbl_preview"."viewer_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viewer_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "app_hoxbl_preview"."project_viewers" ADD CONSTRAINT "project_viewers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app_hoxbl_preview"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_viewers_project_email" ON "app_hoxbl_preview"."project_viewers" USING btree ("project_id",lower("email"));--> statement-breakpoint
CREATE INDEX "idx_project_viewers_project_status" ON "app_hoxbl_preview"."project_viewers" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_project_viewers_email_status" ON "app_hoxbl_preview"."project_viewers" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "viewer_access_tokens_email_lower_unique" ON "app_hoxbl_preview"."viewer_access_tokens" USING btree (lower("email"));