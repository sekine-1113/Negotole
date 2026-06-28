CREATE TABLE "guest_user" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guest_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guest_id" varchar(64) NOT NULL,
	"app_user_id" bigint NOT NULL,
	"transfer_code" varchar(8),
	"transfer_code_expires_at" timestamp,
	"transferred_at" timestamp,
	"transferred_to_user_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "guest_user" ADD CONSTRAINT "guest_user_app_user_id_app_user_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_user" ADD CONSTRAINT "guest_user_transferred_to_user_id_app_user_id_fk" FOREIGN KEY ("transferred_to_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_user_guest_id_uidx" ON "guest_user" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_user_transfer_code_idx" ON "guest_user" USING btree ("transfer_code");