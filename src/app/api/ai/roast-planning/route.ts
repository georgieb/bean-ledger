import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkBudget, recordUsage } from '@/lib/ai-budget'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Roaster-specific system prompts
const ROASTER_PROMPTS = {
  'Fresh Roast SR800': `You are an expert coffee roasting consultant specializing in the Fresh Roast SR800 home roaster. Your role is to create optimized, step-by-step roast profiles based on user inputs and proven SR800 techniques.

## SR800 Technical Specifications
- Fan Range: 1–9 (never use 0). Power Range: 1–9 (never use 0)
- Typical First Crack: 5:30–8:00 (6:00–7:30 is the optimal target window for most beans)
- Standard Roast Duration: 8:30–10:30 (extended to 11:00–12:00 only for Vienna/darker roasts)
- Built-in sensor reads AIR temperature under the bean plate — NOT bean temperature. It runs 50–100°F HIGHER than actual bean temp. Always label temperatures as "Base Sensor (air-side, °F)".
- Drop temperature must always be HIGHER than FC temperature on the same scale.

## Bean Weight & Equipment Guidelines
**Stock Chamber:** Optimal 150–170g. Workable 140–225g. Above 225g circulation degrades.
**Extension Tube (OEM glass):** Optimal 227g washed / 190g naturals. Max ~240g washed. The tube adds thermal buffer — slower to heat, retains heat aggressively once hot.
**Preheat (extension tube):** Run empty at F9/P9 for 1–2 min before charging. Especially for light roasts, naturals, cold rooms (<65°F), or first roast of the session.

## Starting Parameters by Charge Weight

### Extension Tube Starts
| Weight | Bean Type | Start | Hold | Then |
|--------|-----------|-------|------|------|
| 170g | Washed | F8/P3 | 60s | Ramp heat +1 every 60s; walk fan down as beans lighten |
| 200g | Washed | F9/P2 | 60–90s | Build heat in 1–2 step increments every 60–90s |
| 225g | Washed | F9/P2 + preheat | 90s | Same ramp pattern |
| 170g | Natural/honey | F9/P1 | 90s | Slower, gentler ramp — naturals scorch easily |
| 170g | Anaerobic/experimental | F9/P1 | 90–120s soak | Extended drying to prevent tipping |

### Stock Chamber Starts
| Weight | Start | Notes |
|--------|-------|-------|
| 150g | F9/P5 | FC ~5:30–6:30 |
| 170g | F9/P6 | Most common sweet spot; FC ~6:30–7:00 |
| 200g | F9/P7 | FC pushes to 7:00–7:30 |

**Why F9 to start:** Maximum fan prevents scorching dry beans, ensures even circulation, gives room to walk fan down. Power scales with weight.

## Heat & Airflow Dynamics
- Fluid-bed roasters use airflow as primary heat-delivery. Fan controls both bed agitation AND convective heat transfer to beans.
- Stock chamber: run heat near max (P7–P9), modulate fan downward to drive heat. Fan-down adds heat.
- Extension tube: both levers matter. Low power (P1–P3) is productive in late roast.
- Reducing fan by 1 step ≈ increasing effective heat by 2–3 levels.
- Steady even fountain circulation — beans should rotate, not trampoline.

## Temperature Benchmarks (Base Sensor / Air-Side °F)
| Time | Reading | Phase |
|------|---------|-------|
| 0:00 | 200–280°F | Charge |
| 2:00 | 350–390°F | Drying |
| 5:00–6:00 | 440–470°F | Maillard |
| 6:00–8:00 | 470–500°F | First crack onset |
| 8:00–10:00 | 490–530°F | Development → drop |

Drop targets: Light 480–490°F / Light-medium 490–505°F / Medium 505–520°F / Medium-dark 520–530°F / Second crack ~525–545°F

## Phase Timing & DTR
- Drying (charge→yellow): 3:00–4:30. Under 2:30 = splotchy; over 5:00 = baked.
- Maillard (yellow→FC): 2:30–4:00.
- FC target: 6:00–7:30 extension tube 200g (5:30–8:00 acceptable)
- Development: 60–180s
- DTR: 12% hard floor. Lights 13–18%. Mediums 18–22%. Medium-dark 22–28%.

## Bean-Class Profile Guidance

**Ethiopia washed (Yirgacheffe, Sidama):** 200g tube. F9/P2 soak 60s, standard ramp. FC 6:30–7:00. Drop 60–90s post-FC. DTR 13–18%. Honors floral/citrus — over-roasting kills it.

**Ethiopia natural:** Max 170g — chaff fire risk. F9/P1 soak 90s, gentle ramp. FC 6:30–7:30. Drop 90–120s post-FC. Clean chaff collector immediately.

**Colombia (Huila, Nariño):** 200g tube. F9/P3 charge-hot, build to P7. FC 7:00–7:30. Drop 90–120s for City+. DTR 18–22%.

**Kenya AA/SL28:** Dense; needs aggressive energy. F9/P3–P4 charge-hot. FC 7:30–8:00. Watch for fast, loud FC running into 2C quickly.

**Brazil natural:** 200g tube. F9/P2 start. FC 7:00–7:30. Drop 90–150s. Avoid stretching past 11:00 — bakes flat.

**Anaerobic/carbonic/thermal shock:** Soak start mandatory (F9/P1 for 90–120s). Reduce charge 30g vs equivalent washed. Extended development 2:00+ post-FC at low power. Drop earlier than instinct — these run dark fast.

**Guatemala:** F9/P2 start. Reduce fan to F5–F6 by 5:00 mark during Maillard — prone to splotchy roasts if fan too high.

## Stock Chamber Reference Profile (170g, City+)
| Time | Fan | Power | Notes |
|------|-----|-------|-------|
| 0:00 | F9 | P6 | Max fan; moderate-high power |
| 1:00 | F9 | P7 | Hold fan max |
| 2:30 | F8 | P8 | First fan step down |
| 4:00 | F7 | P9 | Heat at max; fan-down drives forward |
| 5:30 | F6 | P9 | Maillard/yellowing; FC approaching |
| 6:30–7:00 | — | — | First crack target |
| 7:30 | F5 | P9 | Development phase |
| ~9:30 | Cool | — | Drop for full medium |

## Environmental Adjustments
- Below 55°F: Roast indoors. Below 32°F: Do not roast outdoors.
- 55–65°F: +1 power throughout. Above 85°F: -1 power or +1 fan.
- High humidity (>70%): +30–60s drying. Low humidity (<30%): watch early scorching.
- Voltage below 115V at outlet: +1 to +2 heat throughout. Always check — voltage drop is #1 troubleshooting variable.
- Altitude >5000ft: +1 fan for adequate air mass circulation; FC audio softer.
- Consecutive roasts: -1 power start on roast 2, -2 on roast 3.

## Output Rules
- Respond with ONLY a JSON object — no markdown, no preamble, no commentary outside the JSON.
- Keep all string values to 1-2 sentences maximum.
- All temperatures in °F (air-side sensor readings).`,

  'default': `You are an expert coffee roasting consultant with deep knowledge of drum roasters, fluid bed roasters, and commercial roasting equipment. You understand:

## Universal Roasting Principles
- Heat application rates and curves
- Airflow management for even development
- Bean density and moisture content impact
- Processing method effects on roast behavior
- Environmental factors (temperature, humidity, altitude)
- Roast development stages (drying, Maillard, development)

## Equipment-Specific Optimization
You adapt your recommendations based on:
- Roaster type (drum, fluid bed, hot air)
- Heat source (gas, electric, infrared)
- Batch capacity and thermal mass
- Available controls (temperature, airflow, drum speed)
- Monitoring capabilities (bean temp probes, environmental sensors)

## Environmental Considerations
**Temperature Effects:**
- **Below 50°F:** Increased preheat time, higher initial heat settings
- **50-70°F:** Moderate adjustments based on roaster thermal mass
- **Above 85°F:** Reduced heat application, monitor for scorching

**Humidity Effects:**
- **High Humidity (>70%):** Extended drying phase, potential for uneven roasts
- **Moderate (40-70%):** Standard protocols apply
- **Low Humidity (<40%):** Faster drying, monitor for surface scorching

**Location Impact:**
- **Indoor:** Controlled environment, consistent results, ventilation critical
- **Outdoor:** Variable conditions, wind effects, temperature swings`
}

export async function POST(request: NextRequest) {
  try {
    const anthropicApiKey = process.env.APP_ANTHROPIC_KEY
    // Check if Anthropic API key is configured
    if (!anthropicApiKey) {
      return NextResponse.json({ 
        error: 'AI features not configured. Please set ANTHROPIC_API_KEY environment variable.' 
      }, { status: 503 })
    }

    const body = await request.json()
    const { 
      green_coffee_name,
      green_coffee_origin,
      processing_method,
      altitude,
      batch_weight,
      roast_goal,
      equipment_brand,
      equipment_model,
      equipment_settings,
      room_temperature,
      humidity,
      roasting_location, // 'indoor' or 'outdoor'
      has_extension_tube,
      user_experience_level, // 'beginner', 'intermediate', 'advanced'
      user_preferences,
      zip_code, // Optional for weather lookup
      save_only, // Flag to save existing profile without AI generation
      existing_profile // Profile to save when save_only is true
    } = body

    // Get user from session (moved to top for use in save_only block)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // If save_only flag is true, skip validation and AI generation
    if (save_only && existing_profile) {
      await recordUsage(user.id, 'saved_roast_profile', {
        green_coffee_name, green_coffee_origin, processing_method,
        altitude, batch_weight, roast_goal, equipment_brand,
        equipment_model, equipment_settings, room_temperature,
        saved_at: new Date().toISOString()
      }, existing_profile)

      return NextResponse.json({
        success: true,
        message: 'Profile saved successfully',
        profile: existing_profile
      })
    }

    // Global daily budget check (only for AI generation, not save_only)
    const budget = await checkBudget('roast_planning')
    if (!budget.allowed) {
      return NextResponse.json(
        { error: `Daily AI budget reached. Resets at midnight. Remaining: $${budget.remaining}` },
        { status: 429 }
      )
    }

    // Validate required fields for AI generation
    if (!green_coffee_name || !batch_weight || !roast_goal || !equipment_brand || !equipment_model) {
      return NextResponse.json({ 
        error: 'Missing required fields: green_coffee_name, batch_weight, roast_goal, equipment_brand, equipment_model' 
      }, { status: 400 })
    }

    if (!room_temperature) {
      return NextResponse.json({ 
        error: 'Room temperature is required for optimal profile generation' 
      }, { status: 400 })
    }

    // Determine roaster type and select appropriate system prompt
    const roasterKey = `${equipment_brand} ${equipment_model}`
    const systemPrompt = (ROASTER_PROMPTS as any)[roasterKey] || ROASTER_PROMPTS['default']

    // Build comprehensive context for Claude
    const environmentalAdjustments = []
    
    if (room_temperature < 50) {
      environmentalAdjustments.push('Cold environment requires increased power/heat throughout profile')
    } else if (room_temperature > 85) {
      environmentalAdjustments.push('Warm environment may require reduced power to prevent overheating')
    }

    if (humidity) {
      if (humidity > 70) {
        environmentalAdjustments.push('High humidity extends drying phase - add 30-60 seconds to initial stage')
      } else if (humidity < 30) {
        environmentalAdjustments.push('Low humidity accelerates drying - monitor closely for scorching')
      }
    }

    const context = `
# Coffee Roasting Profile Generation Request

## Equipment Details:
- **Roaster:** ${equipment_brand} ${equipment_model}
- **Extension Tube:** ${has_extension_tube ? 'Yes' : 'No'}
- **Equipment Settings Schema:** ${JSON.stringify(equipment_settings, null, 2)}

## Green Coffee Information:
- **Coffee Name:** ${green_coffee_name}
- **Origin:** ${green_coffee_origin}
- **Processing Method:** ${processing_method || 'Unknown - make educated assumption based on origin'}
- **Altitude:** ${altitude || 'Unknown'} meters
- **Batch Weight:** ${batch_weight}g

## Environmental Conditions:
- **Room Temperature:** ${room_temperature}°F
- **Humidity:** ${humidity ? `${humidity}%` : 'Not specified'}
- **Roasting Location:** ${roasting_location || 'Not specified'}
- **Environmental Adjustments Needed:** ${environmentalAdjustments.length > 0 ? environmentalAdjustments.join('; ') : 'Standard conditions'}

## Roasting Parameters:
- **Roast Goal:** ${roast_goal}
- **User Experience Level:** ${user_experience_level || 'intermediate'}
- **User Preferences:** ${user_preferences ? JSON.stringify(user_preferences, null, 2) : 'None specified'}

## Equipment-Specific Requirements:
- **Equipment Type:** ${equipment_brand} ${equipment_model}
- **Available Controls:** Based on equipment settings schema
- **Batch Size Optimization:** ${batch_weight}g for this equipment configuration
- **Safety Protocols:** Equipment-appropriate operating procedures
`

    // Determine detail level based on experience
    const detailLevel = user_experience_level === 'beginner' 
      ? 'Include detailed sensory cues (smell changes, color progression, sound descriptions) at each stage. Explain what to watch and listen for.'
      : user_experience_level === 'advanced'
      ? 'Focus on critical transitions only. Assume familiarity with standard progression. Highlight variety-specific peculiarities.'
      : 'Provide moderate detail with key sensory milestones and timing windows.'

    // Build the user prompt based on roaster type
    const userPrompt = roasterKey === 'Fresh Roast SR800'
      ? `${context}

Create a step-by-step SR800 roast profile for the above conditions.

Requirements:
- Apply the correct starting F/P from the charge-weight matrix (extension tube: ${has_extension_tube ? 'YES' : 'NO'})
- Apply all environmental adjustments for ${room_temperature}°F${humidity ? ` / ${humidity}% RH` : ''}
- ${detailLevel}
- All temperatures are air-side °F (base sensor)

Respond with ONLY a JSON object — no markdown. Keep all string values to 1-2 sentences max:
{
  "bean_analysis": "brief bean characteristic analysis",
  "equipment_protocol": "SR800 setup and batch notes",
  "roast_profile": [
    {"time": "0:00", "settings": {"fan": 9, "power": 2}, "temperature": "ambient", "notes": "brief note"}
  ],
  "expected_flavor": {
    "taste_notes": "flavor description",
    "body": "light/medium/full",
    "mouthfeel": "texture",
    "optimal_serving_temp": "range"
  },
  "troubleshooting": {
    "early_first_crack": "fix",
    "late_first_crack": "fix",
    "darker_than_expected": "fix",
    "lighter_than_expected": "fix",
    "uneven_roast": "fix"
  },
  "total_duration": "9:00-9:30",
  "critical_timings": ["First crack: 6:30-7:00", "Drop: 9:00-9:30"]
}`
      : `${context}

Create a detailed, step-by-step roast profile optimized for the ${equipment_brand} ${equipment_model} and the specific conditions above.

**Profile Requirements:**

1. **Bean Analysis**
   - Analyze green coffee characteristics (density, processing, expected behavior)
   - Assess moisture content based on processing method and age
   - Predict roast development based on origin and altitude
   - ${detailLevel}

2. **Equipment Protocol**
   - Safety protocols specific to ${equipment_brand} ${equipment_model}
   - Optimal batch size for ${batch_weight}g in this roaster
   - Preheat requirements (if applicable)
   - Monitoring points and control adjustments

3. **Environmental Adjustments**
   - Temperature compensation for ${room_temperature}°F ambient
   - ${humidity ? `Humidity adjustments for ${humidity}%` : 'Standard humidity protocols'}
   - ${roasting_location === 'outdoor' ? 'Outdoor roasting considerations (wind, temperature variation)' : 'Indoor roasting setup'}
   - Heat application modifications for conditions

4. **Step-by-Step Profile**
   Provide specific settings for ${equipment_brand} ${equipment_model}:
   - Time markers with heat/airflow settings in equipment-specific format
   - Temperature targets (bean temp if probe available, or environmental indicators)
   - ${detailLevel}
   - Phase progression: Drying → Maillard → First Crack → Development → Drop → Cooling

5. **Expected Outcomes**
   - Flavor profile for ${roast_goal} level
   - Roast characteristics and development markers
   - Visual cues for proper development
   - Cup quality expectations

6. **Equipment-Specific Tips**
   - Control adjustments unique to this roaster
   - Common issues with this equipment and solutions
   - Optimization strategies for best results
   - Maintenance considerations

Respond with ONLY a JSON object — no markdown. Keep all string values to 1-2 sentences max:
{
  "bean_analysis": "brief bean characteristic analysis",
  "equipment_protocol": "equipment setup and batch size notes",
  "roast_profile": [
    {"time": "0:00", "settings": {"heat": "setting", "airflow": "setting"}, "temperature": "indicator", "notes": "brief note"}
  ],
  "expected_flavor": {
    "taste_notes": "flavor description",
    "body": "light/medium/full",
    "mouthfeel": "texture",
    "optimal_serving_temp": "range"
  },
  "troubleshooting": {
    "underdeveloped": "fix",
    "overdeveloped": "fix",
    "uneven_roast": "fix",
    "environmental_issues": "fix"
  },
  "total_duration": "expected total roast time",
  "critical_timings": ["First crack: X:XX-X:XX", "Drop: X:XX"]
}`

    // Call Claude API with roasting expertise
    console.log(`Generating roast profile with Claude for ${equipment_brand} ${equipment_model}`)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error response:', errorText)
      throw new Error(`Claude API error: ${claudeResponse.status} ${claudeResponse.statusText} - ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const recommendation = claudeData.content[0].text

    // Parse the JSON response from Claude
    let parsedRecommendation
    try {
      // Extract JSON from Claude's response (handle potential markdown code blocks)
      const jsonMatch = recommendation.match(/```json\s*([\s\S]*?)\s*```/) || recommendation.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        parsedRecommendation = JSON.parse(jsonStr)
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      // If parsing fails, return raw recommendation
      parsedRecommendation = {
        recommendation_text: recommendation,
        error: 'Failed to parse structured response',
        raw_response: recommendation
      }
    }

    await recordUsage(user.id, 'roast_planning', {
      green_coffee_name, green_coffee_origin, processing_method,
      altitude, batch_weight, roast_goal, equipment_brand,
      equipment_model, equipment_settings, room_temperature,
      humidity, roasting_location, has_extension_tube,
      user_experience_level, user_preferences,
      environmental_adjustments: environmentalAdjustments
    }, parsedRecommendation)

    return NextResponse.json({
      success: true,
      profile: parsedRecommendation,
      context: {
        equipment_type: `${equipment_brand} ${equipment_model}`,
        batch_weight,
        has_extension: has_extension_tube,
        roaster_specific: roasterKey === 'Fresh Roast SR800',
        environmental_conditions: {
          temperature: room_temperature,
          humidity: humidity,
          location: roasting_location,
          adjustments_applied: environmentalAdjustments
        }
      }
    })

  } catch (error) {
    console.error('Roast planning API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate roast profile', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}