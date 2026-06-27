ALTER TABLE "user" RENAME TO "app_user";
--> statement-breakpoint
ALTER SEQUENCE "user_id_seq" RENAME TO "app_user_id_seq";
--> statement-breakpoint
ALTER TABLE "app_user" RENAME CONSTRAINT "user_email_unique" TO "app_user_email_unique";
