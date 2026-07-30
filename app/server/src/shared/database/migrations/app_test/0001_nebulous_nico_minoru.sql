ALTER TYPE "app_test"."auth_provider_type" ADD VALUE 'email';--> statement-breakpoint
DROP INDEX "app_test"."idx_users_email";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "app_test"."users" USING btree (lower("email"));