ALTER TABLE "ai_recommendations" DROP CONSTRAINT "ai_recommendations_recommendation_type_check";--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_recommendation_type_check" CHECK (recommendation_type = ANY (ARRAY[
  'brew_recipe',
  'roast_profile',
  'roast_planning',
  'invoice_processing',
  'bean_analysis',
  'saved_roast_profile',
  'equipment_research',
  'extraction_troubleshoot',
  'batch_comparison'
]::text[]));
