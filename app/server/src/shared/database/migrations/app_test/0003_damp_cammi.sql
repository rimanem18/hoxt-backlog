ALTER TABLE "app_test"."tasks" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "app_test"."tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app_test"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "app_test"."tasks" USING btree ("project_id");