ALTER TABLE "post" ADD CONSTRAINT "post_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_point" ADD CONSTRAINT "user_point_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_starts_ends_idx" ON "campaign" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "post_hidden_at_idx" ON "post" USING btree ("hidden_at");--> statement-breakpoint
CREATE INDEX "user_point_user_id_idx" ON "user_point" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_point_expires_at_idx" ON "user_point" USING btree ("expires_at");