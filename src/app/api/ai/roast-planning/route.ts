import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

// Use service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
// Use anon key for user token validation
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Roaster-specific system prompts
const ROASTER_PROMPTS = {
  'Fresh Roast SR800': `You are an expert Fresh Roast SR800 coffee roasting consultant. You have deep knowledge of:

## SR800 Technical Specifications
- **Fan Range:** 1-9 (never use 0)
- **Power Range:** 1-9 (never use 0)
- **Typical First Crack:** 4:00-8:00 (varies by bean weight and setup)
- **Standard Roast Duration:** 8:30-10:30 (extended to 12:00+ only for Vienna/darker roasts)
- **Temperature Display:** Internal thermometer via quick dial spin (°F) - use as relative indicator, not absolute bean temp

## Critical SR800 Operating Principles

### Bean Weight & Equipment Guidelines
**Stock Chamber:**
- Optimal: 150-170g (superior heat consistency and bean movement)
- Lighter loads (140-170g) achieve faster first crack (4-5 min) with better circulation

**Fresh Roast Extension Tube:**
- Optimal: 200g
- Maximum: 217g (higher weights increase circulation challenges)

### Temperature Benchmarks (Internal Display)
- **First Crack:** ~430-440°F (stock chamber), ~490°F (extension tube runs hotter)
- **Finish Temperature:** ~450°F typical
- **Display Access:** Quick dial spin reveals internal temperature
- **Important:** Internal display ≠ bean temp; use as progression indicator

### Heat & Airflow Dynamics
- **Fan-Heat Relationship:** Reducing fan by 1 ≈ increasing heat by 2-3 levels
- **Bean Movement Priority:** Steady circulation without excessive height (better heat retention)
- **No Preheating:** Fluid bed roasters heat instantly
- **Extension Tube Characteristic:** Builds heat significantly faster than stock chamber; use cooling function (H1 F1) intermittently to prevent overheating

### Environmental Impact on Roasting
**Temperature Effects:**
- **Below 50°F (10°C):** Requires +1-2 power levels throughout profile
- **Below 32°F (0°C):** Requires +2-3 power levels; consider indoor roasting
- **Above 85°F (29°C):** May require -1 power level; extension tube builds heat faster

**Humidity Effects:**
- **High Humidity (>70%):** Extends drying phase by 30-60 seconds; may need +1 power in early stages
- **Low Humidity (<30%):** Beans dry faster; monitor closely for scorching in first 2 minutes

**Indoor vs Outdoor:**
- **Outdoor:** More ventilation, cooler ambient, wind affects bean movement
- **Indoor:** Use window with box fan exhaust; warmer ambient temps affect power needs

### Proven Community Routines
**Stock Chamber Baseline:**
- Drying: H9 F9 (2 min)
- To First Crack: H5 F5 (~5 min)
- To Second Crack: H2 F4 (2-3 min if desired)

**Extension Tube Baseline:**
- Drying: H5 F7 (2 min)
- To First Crack: H3 F3 (~4 min)
- To Second Crack: H1 F2 (2-3 min if desired)
- Monitor closely - extension builds heat rapidly`,

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
      // Store the existing profile in database using service role
      const { data: aiRec, error: dbError } = await supabaseAdmin
        .from('ai_recommendations')
        .insert({
          user_id: user.id,
          recommendation_type: 'saved_roast_profile',
          input_context: {
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
            saved_at: new Date().toISOString()
          },
          recommendation: existing_profile
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error saving profile:', dbError)
        return NextResponse.json({ error: 'Failed to save profile to database' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Profile saved successfully',
        profile: existing_profile
      })
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
      ? `${systemPrompt}

${context}

Create a detailed, step-by-step SR800 roast profile optimized for the specific conditions above.

**Profile Requirements:**

1. **Comprehensive Analysis**
   - Analyze bean characteristics (density, processing method, expected moisture)
   - Calculate environmental adjustments for temperature and humidity
   - Determine optimal circulation strategy for equipment configuration
   - ${detailLevel}

2. **Profile Construction**
   - Base on proven SR800 community profiles and techniques
   - Adjust for current environmental conditions
   - Configure for specific batch weight and extension tube setup
   - ${has_extension_tube ? 'START with F7-F9 and low power (P3-P4) for first 60-120 seconds to ensure proper circulation, then transition to target profile' : 'Use target profile settings from start'}

3. **Target Identification**
   State your roasting targets clearly:
   - First Crack Timing: [specific target based on setup]
   - Development Time: [specific target post-FC]
   - Drop Temperature: [internal display target in °F]
   - Total Roast Time: [expected duration]
   - Environmental Adjustments: [list specific power/timing modifications]

4. **Step-by-Step Profile Table**
   Create a table with columns: Time | Fan | Power | Temp (Internal °F) | Notes
   - Use Fan and Power settings from 1-9 only
   - Include temperature readings as Internal Display temps (°F)
   - ${detailLevel}
   - Include phases: Drying → Maillard → First Crack → Development → Cooling

5. **Profile Explanation**
   - Design rationale for this bean/condition combination
   - Environmental adjustment explanation
   - Key transition points and what to expect
   - Sensory guide (smell: grass→toast→caramel; sound: FC characteristics; visual: color progression)
   - ${has_extension_tube ? 'Extension tube heat management and cooling function usage' : 'Stock chamber circulation optimization'}
   - Success indicators for this profile

6. **ChronoRoast Timeline**
   Generate a clickable timeline URL:
   - Base URL: https://chronoroast.webflow.io/
   - alerts parameter: Include EVERY setting change as "0p2f8a62p4a86p6" format (seconds+power+fan, separated by 'a')
   - title parameter: "${green_coffee_origin} ${batch_weight}g - ${roast_goal}"

Respond in JSON format:
{
  "profile_targets": {
    "first_crack_timing": "4:30-5:00",
    "development_time": "1:45 post-FC",
    "drop_temperature": "450°F internal",
    "total_duration": "9:00-9:30",
    "environmental_adjustments": ["list of adjustments made for conditions"]
  },
  "roast_profile": [
    {
      "time": "0:00",
      "settings": {"fan": 8, "power": 4},
      "temperature": "ambient (internal display)",
      "notes": "detailed notes with sensory cues"
    }
  ],
  "profile_explanation": {
    "design_rationale": "why this approach for these beans/conditions",
    "environmental_notes": "how weather/location affected the profile",
    "key_transitions": "what to expect at each phase",
    "sensory_guide": "smell/sound/visual progression details",
    "equipment_guidance": "extension tube or stock chamber specific tips",
    "success_indicators": "what good results look/sound/smell like"
  },
  "chronoroast_url": "https://chronoroast.webflow.io/?alerts=...&title=...",
  "troubleshooting": {
    "early_first_crack": "what to adjust if FC comes 1+ min early",
    "late_first_crack": "what to adjust if FC comes 1+ min late",
    "darker_than_expected": "adjustments for next roast",
    "lighter_than_expected": "adjustments for next roast",
    "uneven_roast": "circulation and airflow fixes"
  }
}`
      : `${systemPrompt}

${context}

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

Respond in JSON format:
{
  "bean_analysis": "detailed analysis of green coffee characteristics and expected roast development",
  "equipment_protocol": {
    "roaster_type": "${equipment_brand} ${equipment_model}",
    "batch_optimization": "specific batch size recommendations",
    "safety_protocols": ["list of equipment-specific safety considerations"],
    "preheat_requirements": "preheat protocol if applicable"
  },
  "environmental_adjustments": {
    "temperature_compensation": "specific adjustments for ambient temp",
    "humidity_impact": "drying phase modifications",
    "location_considerations": "indoor/outdoor specific notes"
  },
  "roast_profile": [
    {
      "time": "0:00",
      "settings": {"heat": "specific setting", "airflow": "specific setting", "drum_speed": "if applicable"},
      "temperature_target": "bean temp or environmental indicator",
      "phase": "Drying Phase",
      "notes": "what to watch for, sensory cues, adjustments"
    }
  ],
  "expected_outcomes": {
    "flavor_profile": "detailed flavor expectations for roast level",
    "roast_characteristics": "development markers and visual cues",
    "cup_quality": "what to expect when brewing"
  },
  "equipment_tips": {
    "control_adjustments": "equipment-specific optimization",
    "common_issues": "problems and solutions for this roaster",
    "maintenance": "relevant maintenance considerations"
  },
  "troubleshooting": {
    "underdeveloped": "signs and corrections",
    "overdeveloped": "signs and corrections",
    "uneven_roast": "causes and solutions",
    "environmental_issues": "condition-related problems"
  },
  "total_duration": "expected total roast time",
  "critical_timings": ["First crack: X:XX-X:XX", "Development: X:XX post-FC", "Target drop temp: XXX°C/°F"]
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
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
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

    // Store recommendation in database using service role
    const { data: aiRec, error: dbError } = await supabaseAdmin
      .from('ai_recommendations')
      .insert({
        user_id: user.id,
        recommendation_type: 'roast_planning',
        input_context: {
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
          roasting_location,
          has_extension_tube,
          user_experience_level,
          user_preferences,
          environmental_adjustments: environmentalAdjustments
        },
        recommendation: parsedRecommendation
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
    }

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