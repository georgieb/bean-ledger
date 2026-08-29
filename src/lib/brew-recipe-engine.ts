/**
 * Deterministic brew recipe calculator.
 *
 * Mirrors the approach in sr800-profile-engine.ts: the numeric parameters
 * (dose, water, ratio, temperature, timing schedule) for the brew methods
 * we already have hand-tuned knowledge of (see BREWING_PROMPTS in
 * brew-recipe/route.ts) are computed here as data/control-flow instead of
 * left for Haiku to reconstruct from a wall of prose on every call. The
 * model's job is downgraded to narration: sensory cues, bean-specific
 * commentary, troubleshooting — never the numbers themselves.
 *
 * Roast level, target flavor profile (bright/balanced/sweet/bold), and
 * coffee age all shift the computed numbers — see PROFILE_ADJUSTMENTS and
 * classifyFreshness below. Any user-supplied dose/ratio/temp is respected
 * as an override and skips the corresponding adjustment entirely. Grind
 * setting text upgrades to a real numeric recommendation when the user's
 * grinder is one we have settings tables for (see GRINDER_CONFIGURATIONS
 * in equipment.ts).
 */

import { getGrinderConfiguration } from './equipment'

export type RoastBucket = 'light' | 'medium' | 'dark'
export type TargetProfile = 'bright' | 'balanced' | 'sweet' | 'bold'
export type Freshness = 'fresh' | 'peak' | 'aging'

export interface BrewStage {
  time: string // "m:ss"
  action: string
}

export interface BrewSkeleton {
  method: string
  doseGrams: number
  waterGrams: number
  ratio: number // water:coffee, e.g. 16 means 1:16
  ratioLabel: string
  waterTempF: number
  waterTempC: number
  grindLabel: string
  totalTimeLabel: string
  stages: BrewStage[]
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function classifyRoastBucket(roastLevel: string): RoastBucket {
  const r = (roastLevel || '').toLowerCase()
  if (r.includes('light')) return 'light'
  if (r.includes('dark') || r.includes('french') || r.includes('vienna')) return 'dark'
  return 'medium'
}

/**
 * Coffee age bucket, same 0-3 / 4-30 / 30+ day windows the route already
 * surfaces as "is_fresh"/"is_aging" narrative flags — reused here to
 * actually move the numbers, not just the commentary.
 */
export function classifyFreshness(daysOld?: number): Freshness {
  if (daysOld == null) return 'peak'
  if (daysOld <= 3) return 'fresh' // still degassing — needs a longer bloom to avoid channeling
  if (daysOld > 30) return 'aging' // lost CO2 and solubility — needs more heat to compensate
  return 'peak'
}

/**
 * Target flavor profile adjustments, applied on top of the roast-level
 * base. Grounded in standard extraction-yield heuristics: bright/acidic
 * sits at the low end of the extraction range (coarser, cooler, more
 * dilute), sweet/rich sits at the high end without tipping into bitterness
 * (finer, hotter), bold/strong is primarily a strength (TDS) move — more
 * coffee relative to water — rather than an extraction-percentage move.
 */
const PROFILE_ADJUSTMENTS: Record<TargetProfile, { ratioDelta: number; tempCDelta: number; grindHint: string; bloomDeltaSeconds: number }> = {
  bright: { ratioDelta: +1, tempCDelta: -2, grindHint: 'slightly coarser to keep acidity forward', bloomDeltaSeconds: -5 },
  balanced: { ratioDelta: 0, tempCDelta: 0, grindHint: '', bloomDeltaSeconds: 0 },
  sweet: { ratioDelta: 0, tempCDelta: +1, grindHint: 'slightly finer to round out sweetness', bloomDeltaSeconds: +5 },
  bold: { ratioDelta: -1, tempCDelta: +1, grindHint: 'unchanged — strength comes from the lower ratio, not grind', bloomDeltaSeconds: 0 }
}

const FRESHNESS_ADJUSTMENTS: Record<Freshness, { tempCDelta: number; bloomExtraSeconds: number }> = {
  fresh: { tempCDelta: 0, bloomExtraSeconds: 20 }, // more CO2 to release — longer bloom prevents channeling
  peak: { tempCDelta: 0, bloomExtraSeconds: 0 },
  aging: { tempCDelta: +2, bloomExtraSeconds: -10 } // less soluble, less gas — hotter water, shorter bloom
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}
function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9)
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function clampRatio(r: number): number {
  return Math.max(1, Math.round(r * 2) / 2) // keep to half-steps, never below 1:1
}

interface MethodDefaults {
  defaultDoseGrams: number
  ratioByRoast: Record<RoastBucket, number>
  tempCByRoast: Record<RoastBucket, number>
  grindByRoast: Record<RoastBucket, string>
  totalTimeSeconds: number
  hasBloom: boolean // whether bloomExtraSeconds shifts this method's stage timing
  buildStages: (doseGrams: number, waterGrams: number, roast: RoastBucket, totalTimeSeconds: number, bloomExtraSeconds: number) => BrewStage[]
}

const METHOD_DEFAULTS: Record<string, MethodDefaults> = {
  'hariov60': {
    defaultDoseGrams: 20,
    ratioByRoast: { light: 15, medium: 16, dark: 17 },
    tempCByRoast: { light: 96, medium: 93, dark: 90 },
    grindByRoast: { light: 'medium-fine (finer end of table salt)', medium: 'medium-fine (table salt texture)', dark: 'medium (slightly coarser than table salt)' },
    totalTimeSeconds: 195, // 3:15 midpoint of 2:30-3:30
    hasBloom: true,
    buildStages: (dose, water, roast, total, bloomExtra) => {
      const bloomWater = Math.round(dose * 2)
      const bloomEnd = 45 + bloomExtra
      const secondPour = 75 + bloomExtra
      return [
        { time: '0:00', action: `Bloom with ${bloomWater}g water, saturating all grounds` },
        { time: fmtTime(bloomEnd), action: `Pour to ${Math.round(water * 0.6)}g total in a slow spiral` },
        { time: fmtTime(secondPour), action: `Pour to ${water}g total` },
        { time: fmtTime(total + bloomExtra), action: 'Drawdown should finish; remove dripper' }
      ]
    }
  },
  'harioswitch': {
    defaultDoseGrams: 20,
    ratioByRoast: { light: 15, medium: 16, dark: 17 },
    tempCByRoast: { light: 95, medium: 92, dark: 89 },
    grindByRoast: { light: 'medium (table salt to kosher salt)', medium: 'medium', dark: 'medium (slightly coarser)' },
    totalTimeSeconds: 210, // 3:30
    hasBloom: true,
    buildStages: (dose, water, roast, total, bloomExtra) => {
      const bloomWater = Math.round(dose * 2)
      const bloomEnd = 45 + bloomExtra
      const openValve = 150 + bloomExtra
      return [
        { time: '0:00', action: `Valve CLOSED. Bloom with ${bloomWater}g water` },
        { time: fmtTime(bloomEnd), action: `Valve still CLOSED. Pour remaining water to ${water}g total` },
        { time: fmtTime(openValve), action: 'Open valve to drain (hybrid mode)' },
        { time: fmtTime(total + bloomExtra), action: 'Full drain complete' }
      ]
    }
  },
  'kalitawave': {
    defaultDoseGrams: 22,
    ratioByRoast: { light: 15, medium: 16, dark: 17 },
    tempCByRoast: { light: 96, medium: 93, dark: 91 },
    grindByRoast: { light: 'medium', medium: 'medium (slightly coarser than V60)', dark: 'medium-coarse' },
    totalTimeSeconds: 210, // 3:30
    hasBloom: true,
    buildStages: (dose, water, roast, total, bloomExtra) => {
      const bloomWater = Math.round(dose * 2.5)
      const pour1 = 40 + bloomExtra
      const pour2 = 90 + bloomExtra
      const pour3 = 135 + bloomExtra
      return [
        { time: '0:00', action: `Bloom with ${bloomWater}g water, small well in center` },
        { time: fmtTime(pour1), action: `Pour in concentric circles to ${Math.round(water * 0.5)}g` },
        { time: fmtTime(pour2), action: `Pour to ${Math.round(water * 0.8)}g, maintaining water level` },
        { time: fmtTime(pour3), action: `Final pour to ${water}g total` },
        { time: fmtTime(total + bloomExtra), action: 'Drawdown finishes' }
      ]
    }
  },
  'frenchpress': {
    defaultDoseGrams: 30,
    ratioByRoast: { light: 13, medium: 14, dark: 15 },
    tempCByRoast: { light: 96, medium: 94, dark: 92 },
    grindByRoast: { light: 'coarse (breadcrumb)', medium: 'coarse (breadcrumb)', dark: 'coarse, slightly finer to compensate for shorter steep' },
    totalTimeSeconds: 270, // 4:30
    hasBloom: false, // full immersion — no separate bloom phase to extend
    buildStages: (dose, water, roast, total) => [
      { time: '0:00', action: `Preheat press, discard water, add ${dose}g grounds, pour full ${water}g` },
      { time: '1:00', action: 'Stir gently to break the crust' },
      { time: '4:00', action: 'Skim any remaining foam' },
      { time: fmtTime(total), action: 'Plunge slowly, decant immediately to stop extraction' }
    ]
  },
  'chemex': {
    defaultDoseGrams: 40,
    ratioByRoast: { light: 15, medium: 16, dark: 17 },
    tempCByRoast: { light: 96, medium: 94, dark: 91 },
    grindByRoast: { light: 'medium (finer end)', medium: 'medium-coarse', dark: 'coarse' },
    totalTimeSeconds: 270, // 4:30
    hasBloom: true,
    buildStages: (dose, water, roast, total, bloomExtra) => {
      const bloomWater = Math.round(dose * 2.5)
      const pour1 = 50 + bloomExtra
      const pour2 = 120 + bloomExtra
      return [
        { time: '0:00', action: `Rinse filter, add grounds, bloom with ${bloomWater}g water` },
        { time: fmtTime(pour1), action: `Slow spiral pour to ${Math.round(water * 0.6)}g` },
        { time: fmtTime(pour2), action: `Continue pouring to ${water}g total` },
        { time: fmtTime(total + bloomExtra), action: 'Allow full drainage, remove filter' }
      ]
    }
  },
  'aeropress': {
    defaultDoseGrams: 15,
    ratioByRoast: { light: 14, medium: 15, dark: 16 },
    tempCByRoast: { light: 90, medium: 85, dark: 80 },
    grindByRoast: { light: 'medium-fine', medium: 'medium-fine', dark: 'fine (compensates for short steep)' },
    totalTimeSeconds: 150, // 2:30 inverted method
    hasBloom: false, // steeped, not bloomed — freshness handled via temp only
    buildStages: (dose, water, roast, total) => [
      { time: '0:00', action: `Inverted position. Add ${dose}g grounds, pour all ${water}g water, stir 3x` },
      { time: '1:30', action: 'Insert plunger cap, no pressure — just seal' },
      { time: '2:00', action: 'Flip onto cup' },
      { time: fmtTime(total), action: 'Press gently over 20-30 seconds until hissing' }
    ]
  },
  'espresso': {
    defaultDoseGrams: 18,
    ratioByRoast: { light: 2.5, medium: 2, dark: 1.8 },
    tempCByRoast: { light: 95, medium: 93, dark: 90 },
    grindByRoast: { light: 'fine, slightly finer for longer extraction', medium: 'fine (powdered sugar)', dark: 'fine, slightly coarser to avoid over-extraction' },
    totalTimeSeconds: 28,
    hasBloom: false,
    buildStages: (dose, water, roast, total) => [
      { time: '0:00', action: `Dose ${dose}g, distribute (WDT), level tamp` },
      { time: '0:00-0:08', action: 'Pre-infusion / first drops appear' },
      { time: fmtTime(total), action: `Stop at ${water}g yield in cup` }
    ]
  },
  'mokapot': {
    defaultDoseGrams: 18,
    ratioByRoast: { light: 8, medium: 7, dark: 6.5 },
    tempCByRoast: { light: 93, medium: 93, dark: 93 }, // bottom chamber pre-boiled water, roast level doesn't change this
    grindByRoast: { light: 'medium-fine (not ideal, moka under-extracts light roasts)', medium: 'medium-fine', dark: 'medium-fine' },
    totalTimeSeconds: 270, // ~4-5 min stovetop
    hasBloom: false,
    buildStages: (dose, water, roast, total) => [
      { time: '0:00', action: `Pre-boiled water (${water}g) in bottom chamber, ${dose}g grounds leveled (not tamped) in basket` },
      { time: '0:00', action: 'Assemble, place on medium-low heat, lid open' },
      { time: '3:30', action: 'Watch for steady, honey-like flow' },
      { time: fmtTime(total), action: 'Remove from heat at hissing/sputtering, run base under cold water' }
    ]
  }
}

export function getBrewEngineKey(methodOrEquipmentLabel: string): string | null {
  const key = normalizeKey(methodOrEquipmentLabel)
  return METHOD_DEFAULTS[key] ? key : null
}

export interface BrewEngineInput {
  method: string // brew_method or brand+model label — matched against METHOD_DEFAULTS
  roastLevel: string
  doseGrams?: number
  waterTemp?: number
  temperatureUnit?: 'fahrenheit' | 'celsius'
  brewRatio?: number
  grinderBrand?: string
  grinderModel?: string
  targetProfile?: TargetProfile // 'bright' | 'balanced' | 'sweet' | 'bold' — the UI's "Target Profile" selector
  daysOld?: number // coffee age in days since roast
}

/**
 * Compute the deterministic recipe skeleton for a brew method, or null if
 * this method isn't one we have hand-tuned numeric defaults for yet (falls
 * back to the legacy fully-AI-generated path in brew-recipe/route.ts).
 */
export function generateBrewSkeleton(input: BrewEngineInput): BrewSkeleton | null {
  const key = getBrewEngineKey(input.method)
  if (!key) return null
  const defaults = METHOD_DEFAULTS[key]
  const roast = classifyRoastBucket(input.roastLevel)
  const profile = PROFILE_ADJUSTMENTS[input.targetProfile as TargetProfile] || PROFILE_ADJUSTMENTS.balanced
  const freshness = FRESHNESS_ADJUSTMENTS[classifyFreshness(input.daysOld)]

  const doseGrams = input.doseGrams && input.doseGrams > 0 ? input.doseGrams : defaults.defaultDoseGrams
  const ratio = input.brewRatio && input.brewRatio > 0
    ? input.brewRatio
    : clampRatio(defaults.ratioByRoast[roast] + profile.ratioDelta)
  const waterGrams = Math.round(doseGrams * ratio)

  let waterTempC: number
  if (input.waterTemp) {
    waterTempC = input.temperatureUnit === 'celsius' ? input.waterTemp : fToC(input.waterTemp)
  } else {
    waterTempC = defaults.tempCByRoast[roast] + profile.tempCDelta + freshness.tempCDelta
  }
  const waterTempF = cToF(waterTempC)

  const bloomExtraSeconds = defaults.hasBloom ? profile.bloomDeltaSeconds + freshness.bloomExtraSeconds : 0

  // Upgrade grind text to a real numeric setting if we have a table for
  // this exact grinder (see GRINDER_CONFIGURATIONS in equipment.ts) —
  // its recommendation keys match the same brew-method labels used here.
  let grindLabel = defaults.grindByRoast[roast]
  if (profile.grindHint) {
    grindLabel = `${grindLabel} — ${profile.grindHint}`
  }
  if (input.grinderBrand && input.grinderModel) {
    const config = getGrinderConfiguration(input.grinderBrand, input.grinderModel)
    const methodLabelMap: Record<string, string> = {
      hariov60: 'Hario V60',
      harioswitch: 'Hario Switch',
      kalitawave: 'Kalita Wave',
      frenchpress: 'French Press',
      chemex: 'Chemex',
      aeropress: 'AeroPress',
      mokapot: 'Moka Pot'
    }
    const rec = config?.recommendations?.[methodLabelMap[key]]
    if (rec) {
      grindLabel = `${rec.setting} on ${input.grinderBrand} ${input.grinderModel} (${rec.description}) — ${grindLabel}`
    }
  }

  return {
    method: key,
    doseGrams,
    waterGrams,
    ratio,
    ratioLabel: `1:${ratio}`,
    waterTempF,
    waterTempC,
    grindLabel,
    totalTimeLabel: fmtTime(defaults.totalTimeSeconds + bloomExtraSeconds),
    stages: defaults.buildStages(doseGrams, waterGrams, roast, defaults.totalTimeSeconds, bloomExtraSeconds)
  }
}
