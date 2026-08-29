/**
 * Safely resolve a `recommendation` value read back from the
 * `ai_recommendations.recommendation` jsonb column.
 *
 * A prior bug in ai-budget.ts's recordUsage() pre-JSON.stringify'd object
 * recommendations before inserting into the jsonb column, which double-
 * encodes them: the column ends up storing a JSON *string* scalar
 * containing the JSON text instead of the actual object. Reading one of
 * those rows back gives a plain string where the UI expects an object,
 * so every nested field access (optimal_parameters, brewing_steps, etc.)
 * silently resolves to undefined and only whatever doesn't depend on them
 * renders.
 *
 * This is fixed going forward (recordUsage no longer double-encodes), but
 * existing saved rows already have the corrupted string form — this
 * helper recovers them on read so old saved profiles keep working.
 */
export function parseStoredRecommendation(value: unknown): any {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value // genuinely a raw-text fallback recommendation, not corrupted JSON
  }
}
