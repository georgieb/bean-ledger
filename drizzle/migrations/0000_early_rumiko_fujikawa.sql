CREATE TABLE "brew_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"roast_batch_id" uuid NOT NULL,
	"brew_method" text NOT NULL,
	"coffee_amount" numeric(8, 2) NOT NULL,
	"water_amount" numeric(8, 2) NOT NULL,
	"grind_setting" text,
	"water_temp" numeric(5, 1),
	"brew_time" interval,
	"equipment_id" uuid,
	"rating" numeric(2, 1),
	"extraction_quality" text,
	"taste_notes" text,
	"notes" text,
	"brewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "green_coffees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"origin" text NOT NULL,
	"farm" text,
	"variety" text,
	"process" text,
	"purchase_date" date,
	"supplier" text,
	"cost_per_kg" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "green_coffees_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "green_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"green_coffee_id" uuid NOT NULL,
	"current_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "green_inventory_user_coffee_unique" UNIQUE("user_id","green_coffee_id")
);
--> statement-breakpoint
CREATE TABLE "roast_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"green_coffee_id" uuid NOT NULL,
	"batch_number" integer NOT NULL,
	"name" text NOT NULL,
	"roast_date" date NOT NULL,
	"roast_level" text NOT NULL,
	"green_weight" numeric(8, 2) NOT NULL,
	"roasted_weight" numeric(8, 2) NOT NULL,
	"equipment_id" uuid,
	"roast_profile" json,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roast_batches_user_batch_unique" UNIQUE("user_id","batch_number")
);
--> statement-breakpoint
CREATE TABLE "roasted_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"roast_batch_id" uuid NOT NULL,
	"current_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roasted_inventory_user_batch_unique" UNIQUE("user_id","roast_batch_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"settings_schema" json DEFAULT '{}'::json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"green_coffee_id" uuid,
	"roast_batch_id" uuid,
	"amount_change" numeric(8, 2) NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_consumption" numeric(6, 2) DEFAULT '40' NOT NULL,
	"default_roast_size" numeric(6, 2) DEFAULT '220' NOT NULL,
	"default_brew_ratio" numeric(4, 1) DEFAULT '15' NOT NULL,
	"preferred_units" text DEFAULT 'grams' NOT NULL,
	"temperature_unit" text DEFAULT 'celsius' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "green_coffees" ADD CONSTRAINT "green_coffees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "green_inventory" ADD CONSTRAINT "green_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "green_inventory" ADD CONSTRAINT "green_inventory_green_coffee_id_green_coffees_id_fk" FOREIGN KEY ("green_coffee_id") REFERENCES "public"."green_coffees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roast_batches" ADD CONSTRAINT "roast_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roast_batches" ADD CONSTRAINT "roast_batches_green_coffee_id_green_coffees_id_fk" FOREIGN KEY ("green_coffee_id") REFERENCES "public"."green_coffees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roasted_inventory" ADD CONSTRAINT "roasted_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roasted_inventory" ADD CONSTRAINT "roasted_inventory_roast_batch_id_roast_batches_id_fk" FOREIGN KEY ("roast_batch_id") REFERENCES "public"."roast_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_green_coffee_id_green_coffees_id_fk" FOREIGN KEY ("green_coffee_id") REFERENCES "public"."green_coffees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_roast_batch_id_roast_batches_id_fk" FOREIGN KEY ("roast_batch_id") REFERENCES "public"."roast_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;