ALTER TYPE "app_hoxbl"."auth_provider_type" ADD VALUE 'email';--> statement-breakpoint
DROP INDEX "app_hoxbl"."idx_users_email";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "app_hoxbl"."users" USING btree (lower("email"));