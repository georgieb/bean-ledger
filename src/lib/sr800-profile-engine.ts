/**
 * Deterministic SR800 roast profile generator.
 *
 * This encodes the same tables that used to live only as prose in
 * ROASTER_PROMPTS['Fresh Roast SR800'] (see roast-planning/route.ts) — but as
 * data and control flow instead of text a language model has to reinterpret
 * on every call. A small/fast model asked to synthesize ~8 overlapping
 * tables at once tends to collapse to a generic "ramp everything up" pattern
 * regardless of what the tables actually say (e.g. it will start naturals at
 * high power even though the SR800 prompt explicitly says F9/P1 for
 * naturals — they scorch easily). Computing the numbers here removes the
 * model from that failure mode entirely: the fan/power/time sequence is
 * always exactly what these tables say, every single call.
 *
 * The LLM's role (see roast-planning/route.ts) is downgraded to narrating
 * this already-correct skeleton — sensory cues, bean-specific commentary,
 * troubleshooting — never restating or altering the numbers.
 */

export type BeanType = 'washed' | 'natural' | 'anaerobic'
export type Chamber = 'tube' | 'stock'

export interface SR800Step {
  time: string // "m:ss"
  seconds: number
  fan: number
  power: number
  phase: 'charge' | 'drying' | 'maillard' | 'first_crack' | 'development' | 'drop'
}

export interface SR800Skeleton {
  chamber: Chamber
  beanType: BeanType
  preheatRecommended: boolean
  steps: SR800Step[]
  fcWindow: string
  dropTimeLabel: string
  totalDurationEstimate: string
  dtrTargetPct: string
  dropTargetLabel: string
}

// --- Starting parameters, straight from the SR800 hand-tuned prompt's tables ---

const STOCK_STARTS: Record<number, { fan: number; power: number }> = {
  150: { fan: 9, power: 5 },
  170: { fan: 9, power: 6 },
  200: { fan: 9, power: 7 }
}

const TUBE_STARTS: Record<number, Partial<Record<BeanType, { fan: number; power: number; holdSeconds: number }>>> = {
  170: {
    washed: { fan: 8, power: 3, holdSeconds: 60 },
    natural: { fan: 9, power: 1, holdSeconds: 90 },
    anaerobic: { fan: 9, power: 1, holdSeconds: 105 } // 90-120s soak, midpoint
  },
  200: {
    washed: { fan: 9, power: 2, holdSeconds: 75 } // 60-90s hold, midpoint
  },
  225: {
    washed: { fan: 9, power: 2, holdSeconds: 90 } // + preheat
  }
}

function classifyBeanType(processingMethod?: string): BeanType {
  const m = (processingMethod || '').toLowerCase()
  if (m.includes('anaerobic') || m.includes('carbonic') || m.includes('thermal shock') || m.includes('experimental')) {
    return 'anaerobic'
  }
  if (m.includes('natural') || m.includes('honey') || m.includes('pulped')) {
    return 'natural'
  }
  return 'washed' // safest default — washed is the most forgiving, most common process
}

function nearestBucket(weight: number, buckets: number[]): number {
  return buckets.reduce((closest, b) => (Math.abs(b - weight) < Math.abs(closest - weight) ? b : closest))
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface EnvDeltas {
  powerDelta: number
  fanDelta: number
  dryingExtensionSeconds: number
}

function computeEnvironmentalDeltas(roomTemperature?: number, humidity?: number): EnvDeltas {
  let powerDelta = 0
  let fanDelta = 0
  let dryingExtensionSeconds = 0

  if (roomTemperature != null) {
    if (roomTemperature < 55) powerDelta += 1 // roast indoors guidance implied; treat as cold-environment compensation
    else if (roomTemperature >= 55 && roomTemperature <= 65) powerDelta += 1
    else if (roomTemperature > 85) fanDelta += 1
  }

  if (humidity != null) {
    if (humidity > 70) dryingExtensionSeconds += 45 // 30-60s, midpoint
    // low humidity (<30%) is a "watch closely" caution, not a numeric adjustment
  }

  return { powerDelta, fanDelta, dryingExtensionSeconds }
}

function clampFan(v: number): number {
  return Math.max(1, Math.min(9, v))
}
function clampPower(v: number): number {
  return Math.max(1, Math.min(9, v))
}

/**
 * Development-time-ratio target by roast goal, used only to decide how long
 * to hold post-FC before dropping — the actual temperature is never
 * measured (SR800's sensor is air-side, not bean temp) so we only ever
 * express drop points as time + a labeled target range, matching how the
 * hand-tuned prompt itself frames "Base Sensor (air-side, °F)" estimates.
 */
function dtrTargetForGoal(roastGoal: string): { pct: string; developmentSeconds: number } {
  const g = roastGoal.toLowerCase()
  if (g.includes('light')) return { pct: '13-18%', developmentSeconds: 75 }
  if (g.includes('dark') || g.includes('vienna') || g.includes('french')) return { pct: '22-28%', developmentSeconds: 165 }
  return { pct: '18-22%', developmentSeconds: 120 } // medium default
}

function dropTargetLabelForGoal(roastGoal: string): string {
  const g = roastGoal.toLowerCase()
  if (g.includes('light')) return 'Light 480-490°F (air-side)'
  if (g.includes('dark') || g.includes('vienna') || g.includes('french')) return 'Medium-dark 520-530°F (air-side)'
  return 'Medium 505-520°F (air-side)'
}

export interface SR800EngineInput {
  batchWeight: number
  hasExtensionTube: boolean
  processingMethod?: string
  roastGoal: string
  roomTemperature?: number
  humidity?: number
}

export function generateSR800Skeleton(input: SR800EngineInput): SR800Skeleton {
  const chamber: Chamber = input.hasExtensionTube ? 'tube' : 'stock'
  const beanType = classifyBeanType(input.processingMethod)
  const env = computeEnvironmentalDeltas(input.roomTemperature, input.humidity)
  const { pct: dtrTargetPct, developmentSeconds } = dtrTargetForGoal(input.roastGoal)

  const steps: SR800Step[] = []
  let fcCenterSeconds: number

  if (chamber === 'stock') {
    const bucket = nearestBucket(input.batchWeight, [150, 170, 200])
    const start = STOCK_STARTS[bucket]
    const startPower = clampPower(start.power + env.powerDelta)
    const startFan = clampFan(start.fan + env.fanDelta)

    // Stock chamber pattern: heat runs near max, fan is the primary lever —
    // walk fan DOWN while power climbs to max, per "Heat & Airflow Dynamics"
    // (fan-down ≈ +2-3 effective heat levels). Mirrors the hand-tuned
    // "Stock Chamber Reference Profile (170g, City+)" table.
    const schedule: [number, number, number][] = [
      // [seconds, fanDelta-from-start, power]
      [0, 0, startPower],
      [60, 0, clampPower(startPower + 1)],
      [150, -1, clampPower(startPower + 2)],
      [240, -2, 9],
      [330, -3, 9]
    ]
    for (const [sec, fanDelta, power] of schedule) {
      steps.push({
        time: fmtTime(sec + env.dryingExtensionSeconds * (sec > 0 ? 1 : 0)),
        seconds: sec + (sec > 0 ? env.dryingExtensionSeconds : 0),
        fan: clampFan(startFan + fanDelta),
        power,
        phase: sec === 0 ? 'charge' : sec < 150 ? 'drying' : sec < 240 ? 'maillard' : 'maillard'
      })
    }
    fcCenterSeconds = 405 + env.dryingExtensionSeconds // ~6:45, mid of 6:30-7:00 reference window
    steps.push({
      time: fmtTime(fcCenterSeconds),
      seconds: fcCenterSeconds,
      fan: clampFan(startFan - 3),
      power: 9,
      phase: 'first_crack'
    })
    const devStart = fcCenterSeconds + 45
    steps.push({
      time: fmtTime(devStart),
      seconds: devStart,
      fan: clampFan(startFan - 4),
      power: 9,
      phase: 'development'
    })
  } else {
    const bucket = nearestBucket(input.batchWeight, [170, 200, 225])
    let base = TUBE_STARTS[bucket]?.[beanType]
    if (!base) {
      // Not explicitly tabled at this weight for this bean type (e.g. natural
      // at 200g/225g) — derate from the washed baseline the same direction
      // the 170g table does (lower start power, longer hold) rather than
      // silently falling back to washed defaults.
      const washedBase = TUBE_STARTS[bucket]?.washed ?? TUBE_STARTS[170].washed!
      base = beanType === 'washed'
        ? washedBase
        : { fan: washedBase.fan, power: Math.max(1, washedBase.power - 1), holdSeconds: washedBase.holdSeconds + 30 }
    }
    const startPower = clampPower(base.power + env.powerDelta)
    const startFan = clampFan(base.fan + env.fanDelta)
    const holdSeconds = base.holdSeconds + env.dryingExtensionSeconds

    steps.push({ time: fmtTime(0), seconds: 0, fan: startFan, power: startPower, phase: 'charge' })
    steps.push({ time: fmtTime(holdSeconds), seconds: holdSeconds, fan: startFan, power: startPower, phase: 'drying' })

    fcCenterSeconds = (beanType === 'washed' ? 405 : 435) + env.dryingExtensionSeconds // washed centers ~6:45, naturals run a bit later

    // Ramp: +1 power per interval (naturals/anaerobic ramp slower — 90s
    // intervals vs 60s for washed, per "Slower, gentler ramp — naturals
    // scorch easily"), walking fan down once beans have lightened (~drying
    // complete), floor F5 to preserve circulation per equipment guidelines.
    // Runs all the way up to the FC window so power/fan arrive there
    // continuously — no artificial jump at the first-crack marker.
    const rampIntervalSeconds = beanType === 'washed' ? 60 : 90
    let t = holdSeconds
    let power = startPower
    let fan = startFan
    let fanStepDue = holdSeconds + rampIntervalSeconds * 2 // start walking fan down a bit after ramp begins
    while (t + rampIntervalSeconds < fcCenterSeconds) {
      t += rampIntervalSeconds
      power = clampPower(power + 1)
      if (t >= fanStepDue && fan > 5) {
        fan = clampFan(fan - 1)
        fanStepDue += rampIntervalSeconds
      }
      steps.push({
        time: fmtTime(t),
        seconds: t,
        fan,
        power,
        phase: t < 210 ? 'drying' : 'maillard'
      })
    }
    steps.push({ time: fmtTime(fcCenterSeconds), seconds: fcCenterSeconds, fan, power, phase: 'first_crack' })

    // Development: extension tube technique allows throttling power back
    // down while fan continues doing the work ("Low power (P1-P3) is
    // productive in late roast" — distinct from stock chamber, which stays
    // near max power throughout). Step down gently, not to an arbitrary floor.
    const devStart = fcCenterSeconds + 45
    const devPower = Math.max(1, power - 2)
    const devFan = clampFan(fan - 1)
    steps.push({ time: fmtTime(devStart), seconds: devStart, fan: devFan, power: devPower, phase: 'development' })
  }

  const dropSeconds = fcCenterSeconds + 45 + developmentSeconds
  steps.push({
    time: fmtTime(dropSeconds),
    seconds: dropSeconds,
    fan: 1,
    power: 1,
    phase: 'drop'
  })

  const fcStart = fcCenterSeconds - 30
  const fcEnd = fcCenterSeconds + 30

  return {
    chamber,
    beanType,
    preheatRecommended: chamber === 'tube' && (beanType !== 'washed' || (input.roomTemperature ?? 70) < 65),
    steps,
    fcWindow: `${fmtTime(fcStart)}-${fmtTime(fcEnd)}`,
    dropTimeLabel: fmtTime(dropSeconds),
    totalDurationEstimate: `${fmtTime(dropSeconds - 30)}-${fmtTime(dropSeconds + 30)}`,
    dtrTargetPct,
    dropTargetLabel: dropTargetLabelForGoal(input.roastGoal)
  }
}
