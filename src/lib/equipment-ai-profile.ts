import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { equipmentAiProfiles } from '@/lib/schema'
import { checkBudget, recordUsage } from '@/lib/ai-budget'

const RESEARCH_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Normalize brand/model text for matching so trivial formatting differences
 * ("SR-800" vs "sr800" vs "SR 800") don't cause a miss against hand-tuned
 * prompts or the AI-researched cache.
 */
function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function normalizeEquipmentKey(brand: string, model: string): string {
  return normalizeString(`${brand} ${model}`)
}

interface ResearchedProfile {
  summary: string
  control_ranges: Record<string, string>
  starting_parameters: { scenario: string; settings: string; notes: string }[]
  recommended_recipes: { name: string; profile_summary: string; notes: string }[]
  known_quirks: string[]
  confidence: 'high' | 'medium' | 'low'
}

function profileToSystemPrompt(
  type: 'roaster' | 'brewer' | 'grinder',
  brand: string,
  model: string,
  profile: ResearchedProfile
): string {
  const confidenceNote =
    profile.confidence !== 'high'
      ? `\n\n**Note:** Model-knowledge confidence for this exact device is ${profile.confidence}. Treat starting parameters as a reasonable first approximation — advise the user to calibrate against their first one or two batches rather than trusting these numbers exactly.`
      : ''

  return `You are an expert ${type} consultant specializing in the ${brand} ${model}. Your knowledge of this specific device:

## Device Summary
${profile.summary}

## Controls
${Object.entries(profile.control_ranges).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

## Starting Parameters
${profile.starting_parameters.map(p => `- **${p.scenario}:** ${p.settings} — ${p.notes}`).join('\n')}

## Recommended Recipes
${profile.recommended_recipes.map(r => `- **${r.name}:** ${r.profile_summary} (${r.notes})`).join('\n')}

## Known Quirks
${profile.known_quirks.map(q => `- ${q}`).join('\n')}
${confidenceNote}

Apply this device knowledge to the specific request below. Respond with ONLY the JSON object the user prompt asks for — no markdown, no commentary outside the JSON.`
}

/**
 * Resolve the best available system prompt for a piece of equipment:
 * 1. Hand-tuned prompt (exact table lookup, normalized) — cheapest and best.
 * 2. Previously AI-researched profile, cached globally by brand+model.
 * 3. Fresh AI research call (one Haiku call), cached for every future user
 *    with the same equipment.
 * 4. Generic fallback prompt, if research is unavailable or fails.
 *
 * Never throws — any failure degrades to `defaultPrompt` so a broken or
 * budget-exhausted research step never blocks the user's actual request.
 */
export async function getEquipmentSystemPrompt(params: {
  type: 'roaster' | 'brewer' | 'grinder'
  brand: string
  model: string
  handTunedPrompts: Record<string, string>
  defaultPrompt: string
  anthropicApiKey: string
  userId: string
}): Promise<{ systemPrompt: string; source: 'hand_tuned' | 'ai_cached' | 'ai_researched' | 'default' }> {
  const { type, brand, model, handTunedPrompts, defaultPrompt, anthropicApiKey, userId } = params
  const normalizedKey = normalizeEquipmentKey(brand, model)

  // 1. Hand-tuned table, normalized match
  for (const [key, prompt] of Object.entries(handTunedPrompts)) {
    if (key === 'default') continue
    if (normalizeString(key) === normalizedKey) {
      return { systemPrompt: prompt, source: 'hand_tuned' }
    }
  }

  // 2. AI-researched cache (global, shared across users)
  try {
    const [cached] = await db
      .select()
      .from(equipmentAiProfiles)
      .where(and(eq(equipmentAiProfiles.type, type), eq(equipmentAiProfiles.normalizedKey, normalizedKey)))
      .limit(1)

    if (cached) {
      return {
        systemPrompt: profileToSystemPrompt(type, brand, model, cached.profile as ResearchedProfile),
        source: 'ai_cached'
      }
    }
  } catch (err) {
    console.error('equipment-ai-profile: cache lookup failed', err)
  }

  // 3. Fresh research call — gated by the same shared budget as everything else
  try {
    const budget = await checkBudget('equipment_research')
    if (!budget.allowed) {
      console.warn('equipment-ai-profile: research skipped, budget exhausted')
      return { systemPrompt: defaultPrompt, source: 'default' }
    }

    const researchPrompt = `Research the ${brand} ${model} coffee ${type}. Respond with ONLY a JSON object, no markdown:
{
  "summary": "1-2 sentence description of the device and how it works",
  "control_ranges": { "control name (e.g. heat, fan, dose)": "range/units and what it does" },
  "starting_parameters": [
    { "scenario": "e.g. 200g light roast washed coffee", "settings": "recommended starting settings", "notes": "1 sentence" }
  ],
  "recommended_recipes": [
    { "name": "recipe name", "profile_summary": "settings/steps summary", "notes": "1 sentence" }
  ],
  "known_quirks": ["notable quirks, common mistakes, or maintenance notes for this specific model"],
  "confidence": "high|medium|low — your confidence in having reliable, specific knowledge of this exact model (not just the general category of device)"
}
If you don't have specific knowledge of this exact model, give your best generalization from similar ${type}s of this type/brand and set confidence to "low".`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: RESEARCH_MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: researchPrompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Research call failed: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content[0].text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in research response')
    const profile: ResearchedProfile = JSON.parse(jsonMatch[1] || jsonMatch[0])

    await db.insert(equipmentAiProfiles).values({
      type,
      normalizedKey,
      brand,
      model,
      profile,
      generatedByModel: RESEARCH_MODEL
    }).onConflictDoNothing()

    await recordUsage(userId, 'equipment_research', { type, brand, model }, profile)

    return { systemPrompt: profileToSystemPrompt(type, brand, model, profile), source: 'ai_researched' }
  } catch (err) {
    console.error('equipment-ai-profile: research failed, falling back to default prompt', err)
    return { systemPrompt: defaultPrompt, source: 'default' }
  }
}
