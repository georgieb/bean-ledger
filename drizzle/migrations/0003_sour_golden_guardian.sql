CREATE TABLE "equipment_ai_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"normalized_key" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"profile" json NOT NULL,
	"generated_by_model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_ai_profiles_type_key_unique" UNIQUE("type","normalized_key")
);
