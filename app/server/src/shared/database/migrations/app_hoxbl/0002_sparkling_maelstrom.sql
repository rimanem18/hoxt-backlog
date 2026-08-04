CREATE SCHEMA IF NOT EXISTS "app_hoxbl";
--> statement-breakpoint
CREATE TABLE "app_hoxbl"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "non_empty_name" CHECK (length(trim("app_hoxbl"."projects"."name")) > 0),
	CONSTRAINT "name_length" CHECK (length("app_hoxbl"."projects"."name") <= 100)
);
--> statement-breakpoint
ALTER TABLE "app_hoxbl"."projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_hoxbl"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_projects_user_id" ON "app_hoxbl"."projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_projects_user_created" ON "app_hoxbl"."projects" USING btree ("user_id","created_at" DESC NULLS LAST);