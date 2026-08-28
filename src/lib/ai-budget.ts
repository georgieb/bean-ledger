import { createClient } from '@supabase/supabase-js'

const DAILY_BUDGET_USD = 1.00

// Conservative cost estimates per call in USD (Haiku pricing: $0.25/M in, $1.25/M out)
export const ESTIMATED_COST_USD: Record<string, number> = {
  brew_recipe:          0.003, // large system prompt ~3k in + ~1.5k out
  roast_planning:       0.003, // large system prompt ~3k in + ~2k out
  roast_profile:        0.002, // ~1k in + ~1.2k out
  invoice_processing:   0.002, // vision ~2k in + ~0.6k out
  bean_analysis:        0.002, // vision ~2k in + ~0.7k out
  saved_roast_profile:  0,     // no AI call, just persisting an existing profile
  equipment_research:   0.002, // one-time per unique equipment, cached globally after
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

/**
 * Returns today's aggregate spend in USD across all users.
 * Uses the service role key so it can read across all users' rows.
 */
async function getTodaySpend(): Promise<number> {
  const admin = getAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await admin
    .from('ai_recommendations')
    .select('input_context')
    .gte('created_at', todayStart.toISOString())
    .not('input_context->cost_usd', 'is', null)

  if (error) {
    console.error('ai-budget: failed to fetch today spend', error)
    return 0 // fail open rather than blocking all requests on a DB error
  }

  return (data ?? []).reduce((sum, row) => {
    const cost = (row.input_context as any)?.cost_usd ?? 0
    return sum + Number(cost)
  }, 0)
}

/**
 * Check whether there is budget remaining for this call type.
 * Returns { allowed, spent, remaining }.
 */
export async function checkBudget(type: string): Promise<{
  allowed: boolean
  spent: number
  remaining: number
}> {
  const estimated = ESTIMATED_COST_USD[type] ?? 0.003
  const spent = await getTodaySpend()
  const remaining = Math.max(0, DAILY_BUDGET_USD - spent)
  return {
    allowed: spent + estimated <= DAILY_BUDGET_USD,
    spent: Math.round(spent * 10000) / 10000,
    remaining: Math.round(remaining * 10000) / 10000,
  }
}

/**
 * Insert a usage record including the cost estimate so future budget checks
 * can sum it up. Call this after a successful Claude response.
 */
export async function recordUsage(
  userId: string,
  type: string,
  inputContext: Record<string, unknown>,
  recommendation: unknown
): Promise<void> {
  const admin = getAdminClient()
  const cost = ESTIMATED_COST_USD[type] ?? 0.003

  const { error } = await admin.from('ai_recommendations').insert({
    user_id: userId,
    recommendation_type: type,
    input_context: { ...inputContext, cost_usd: cost },
    recommendation: typeof recommendation === 'string'
      ? recommendation
      : JSON.stringify(recommendation),
  })

  if (error) {
    console.error('ai-budget: failed to record usage', error)
  }
}
