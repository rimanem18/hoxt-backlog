DO $$ BEGIN
 CREATE TYPE "app_test"."viewer_status" AS ENUM('active', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_test"."project_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "app_test"."viewer_status" DEFAULT 'active' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_viewer_email" CHECK ("app_test"."project_viewers"."email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_test"."viewer_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viewer_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_test"."project_viewers" ADD CONSTRAINT "project_viewers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app_test"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_project_viewers_project_email" ON "app_test"."project_viewers" USING btree ("project_id",lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_viewers_project_status" ON "app_test"."project_viewers" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_viewers_email_status" ON "app_test"."project_viewers" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "viewer_access_tokens_email_lower_unique" ON "app_test"."viewer_access_tokens" USING btree (lower("email"));