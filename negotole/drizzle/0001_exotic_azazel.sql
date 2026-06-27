ALTER TABLE "user" ALTER COLUMN "birth_year" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");