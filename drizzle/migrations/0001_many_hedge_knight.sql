CREATE TABLE "scheduled_roasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"coffee_name" text NOT NULL,
	"green_coffee_name" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"green_weight" numeric(8, 2) NOT NULL,
	"target_roast_level" text NOT NULL,
	"equipment_id" uuid,
	"notes" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_roasts_user_id_idx" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "scheduled_roasts" ADD CONSTRAINT "scheduled_roasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;