CREATE TABLE "report" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "report_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"post_id" bigint NOT NULL,
	"reporter_id" bigint,
	"reason" varchar(255) NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_app_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_post_id_idx" ON "report" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "report_created_at_idx" ON "report" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_post_reporter_uidx" ON "report" USING btree ("post_id","reporter_id");