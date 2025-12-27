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

// Brewing equipment-specific system prompts
const BREWING_PROMPTS = {
  'Hario V60': `You are an expert Hario V60 brewing consultant with deep knowledge of:

## Hario V60 Characteristics
- **Cone Angle:** 60-degree cone with single large hole
- **Flow Rate:** Fast drainage - requires proper pouring technique
- **Rib Design:** Spiral ribs allow air escape and prevent filter adhesion
- **Paper Filters:** Require rinsing to remove paper taste
- **Grind Sensitivity:** Very sensitive to grind size changes
- **Optimal Dose:** 15-30g coffee (single serve to large cup)

## V60 Brewing Fundamentals
- **Grind Size:** Medium to medium-fine (texture between sand and table salt)
- **Water Temp:** 90-96°C (194-205°F) - adjust based on roast level
- **Brew Ratio:** 1:15 to 1:17 (coffee to water)
- **Total Brew Time:** 2:30-3:30 for optimal extraction
- **Pouring Technique:** Critical - controls flow rate and extraction

## Roast-Specific Adjustments
- **Light Roasts:** Hotter water (95-96°C), finer grind, slower pour
- **Medium Roasts:** Standard parameters (92-94°C), medium grind
- **Dark Roasts:** Cooler water (88-92°C), coarser grind, faster pour

## Classic V60 Techniques
**Tetsu Kasuya 4:6 Method:**
- First 40% of water in 2 pours (sweetness/strength control)
- Remaining 60% in 2-3 pours (strength control)
- Total time: ~3:30

**James Hoffmann Method:**
- Bloom with 2x coffee weight for 45 seconds
- Pour to 60% total in spiral motion
- Pour to 100% total by 1:15
- Target finish: 3:00-3:30

**Rao Spin Method:**
- Single continuous pour after bloom
- Gentle swirl at end to level bed
- Consistent extraction through agitation`,

  'Hario Switch': `You are an expert Hario Switch brewing consultant with deep knowledge of:

## Hario Switch Characteristics
- **Hybrid Design:** V60 cone + immersion valve
- **Versatility:** Can brew as V60 or immersion or hybrid
- **Flow Control:** Ball valve allows precise drainage timing
- **Grind Flexibility:** Less sensitive than V60 due to immersion option
- **Optimal Dose:** 15-30g coffee

## Switch Brewing Modes

### Full Immersion Mode (Beginner-Friendly)
- Valve CLOSED during entire brew
- Steep 2-4 minutes depending on grind
- Open valve to drain
- More forgiving than V60
- Grind: Medium (like French press)

### Hybrid Mode (Recommended)
- Bloom with valve CLOSED (30-45 sec)
- Pour remaining water with valve OPEN
- Combines immersion and percolation benefits
- Grind: Medium to medium-fine

### V60 Mode
- Valve OPEN entire time
- Same as standard V60 technique
- Grind: Medium-fine

## Switch-Specific Advantages
- **Consistency:** Immersion mode reduces technique variables
- **Experimentation:** Easy to test immersion vs percolation
- **Forgiveness:** Closed valve compensates for pour technique issues
- **Temperature Retention:** Better heat retention in immersion mode

## Recommended Switch Method
1. Rinse filter, valve CLOSED
2. Add coffee, bloom with 2x coffee weight, 45 seconds
3. Pour to total water amount (valve still CLOSED)
4. Steep total time: 2:00-3:00 (adjust for strength)
5. OPEN valve to drain
6. Target total time: 3:00-4:00`,

  'Kalita Wave': `You are an expert Kalita Wave brewing consultant with deep knowledge of:

## Kalita Wave Characteristics
- **Flat Bottom:** Promotes even extraction across entire bed
- **Three Drainage Holes:** Slower, more controlled drainage than V60
- **Wave Filter:** Minimal contact with brewer walls
- **Flow Rate:** Moderate - more forgiving than V60
- **Optimal Dose:** 15-35g coffee
- **Sizes:** 155 (single cup), 185 (larger brews)

## Kalita Wave Fundamentals
- **Grind Size:** Medium (slightly coarser than V60)
- **Water Temp:** 91-96°C (196-205°F)
- **Brew Ratio:** 1:15 to 1:17
- **Total Brew Time:** 3:00-3:45 for optimal extraction
- **Pouring:** Center-focused to maintain flat bed

## Wave-Specific Advantages
- **Consistency:** Flat bed and restricted flow = repeatable results
- **Forgiveness:** Less technique-dependent than V60
- **Even Extraction:** Flat bottom prevents channeling
- **Temperature Stability:** Less contact with brewer walls

## Classic Wave Technique
1. Rinse wave filter thoroughly
2. Add coffee, create small well in center
3. Bloom: 2-3x coffee weight, 30-45 seconds
4. Pour in concentric circles, maintaining water level
5. 3-4 pours total, ending by 2:30
6. Target finish: 3:15-3:45

## Roast Adjustments
- **Light Roasts:** Hotter water, slightly finer grind, longer contact
- **Medium Roasts:** Standard parameters
- **Dark Roasts:** Cooler water, coarser grind, faster brew`,

  'French Press': `You are an expert French Press brewing consultant with deep knowledge of:

## French Press Characteristics
- **Full Immersion:** Complete saturation of grounds
- **Metal Filter:** Allows oils and fines through (body and texture)
- **Temperature Loss:** Significant heat loss during brewing
- **Grind Sensitivity:** Coarse grind essential to prevent over-extraction
- **Optimal Dose:** 30-60g coffee (varies by press size)

## French Press Fundamentals
- **Grind Size:** Coarse (breadcrumb texture)
- **Water Temp:** 93-96°C (200-205°F) - preheat vessel
- **Brew Ratio:** 1:12 to 1:15 (stronger than pour-over)
- **Steep Time:** 4:00-5:00 minutes
- **Pressing:** Slow, gentle pressure

## Critical Techniques

### Preheating Protocol
1. Preheat French Press with hot water
2. Discard preheat water
3. Add coffee immediately

### James Hoffmann Method
1. Add coffee and water, start timer
2. Allow crust to form (4:00)
3. Break crust and remove foam
4. Wait 5-8 minutes for settling
5. Gentle plunge (just below surface)
6. Decant immediately

### Traditional Method
1. Add coffee, bloom 30 seconds with small amount
2. Add remaining water
3. Stir gently at 1:00
4. Place lid, don't plunge yet
5. At 4:00, plunge slowly
6. Serve immediately

## Common French Press Issues
- **Muddy/Silty:** Grind too fine, adjust coarser
- **Weak/Watery:** Ratio too low, increase coffee dose
- **Bitter:** Over-extraction from too fine grind or too long steep
- **Sour/Astringent:** Under-extraction, try finer grind or hotter water`,

  'Chemex': `You are an expert Chemex brewing consultant with deep knowledge of:

## Chemex Characteristics
- **Thick Bonded Filters:** 20-30% heavier than standard filters
- **Cone Design:** Similar angle to V60 but slower flow
- **Glass Carafe:** Excellent heat retention and presentation
- **Flow Rate:** Slow due to thick filters
- **Optimal Dose:** 30-50g coffee (Chemex excels at larger batches)

## Chemex Fundamentals
- **Grind Size:** Medium-coarse (between V60 and French Press)
- **Water Temp:** 92-96°C (198-205°F)
- **Brew Ratio:** 1:15 to 1:17
- **Total Brew Time:** 4:00-5:00 for optimal extraction
- **Filter Preparation:** Critical - rinse thoroughly

## Chemex-Specific Techniques

### Filter Preparation
1. Fold filter into cone (3 layers on one side)
2. Place with thick side against spout
3. Rinse with ~2x brew water volume
4. Ensure filter adheres to walls
5. Discard rinse water

### Classic Chemex Method
1. Bloom: 2-3x coffee weight, 45-60 seconds
2. Slow spiral pour to 60% total (by 2:00)
3. Continue pouring to 100% (by 3:00-3:30)
4. Allow full drainage
5. Target finish: 4:30-5:00

### Large Batch Optimization (40-50g)
- Use medium-coarse grind
- Longer bloom (60 seconds)
- Multiple pours (4-5 total)
- Maintain consistent water level
- Target time: 5:00-5:30

## Roast Adjustments
- **Light Roasts:** Finer grind (medium), hotter water (95-96°C)
- **Medium Roasts:** Standard medium-coarse
- **Dark Roasts:** Coarse grind, cooler water (90-92°C)`,

  'AeroPress': `You are an expert AeroPress brewing consultant with deep knowledge of:

## AeroPress Characteristics
- **Pressure Brewing:** Air pressure accelerates extraction
- **Versatility:** Hundreds of recipe variations possible
- **Portability:** Compact, durable, travel-friendly
- **Quick Brewing:** 1-3 minute total time
- **Paper or Metal Filters:** Different body/clarity options
- **Optimal Dose:** 11-20g coffee

## AeroPress Orientations

### Standard (Right-Side-Up)
- Chamber on top of cup
- Add coffee, then water
- Steep, then press
- Easier for beginners
- More like immersion brewing

### Inverted
- Plunger inserted, chamber inverted
- Add coffee, then water
- Steep, then flip and press
- No drip-through during steep
- More control over steep time

## AeroPress Fundamentals
- **Grind Size:** Fine to medium-fine (very versatile)
- **Water Temp:** 80-96°C (varies by method and roast)
- **Brew Ratio:** 1:12 to 1:17 (concentrated to regular strength)
- **Steep Time:** 1:00-3:00
- **Press Time:** 20-40 seconds

## Popular Methods

### James Hoffmann Method (Inverted)
- 11g coffee, medium-fine grind
- 200g water at 85°C
- Inverted position
- Steep 2:00, swirl
- Press gently (30 seconds)

### World Championship Recipe Style
- 15-20g coffee, fine grind
- 200g water at 85-90°C
- Standard position
- Quick 1:00 steep
- Fast press (20 seconds)

### Alan Adler Original (Inventor's Method)
- 15-17g coffee, fine grind
- Fill to #4 mark (~220g)
- Stir 10 seconds
- Press immediately (20-30 seconds)
- Dilute to taste

## Pressure Technique
- **Gentle Press:** Slow, steady pressure prevents bitterness
- **Resistance Point:** If too hard to press, grind is too fine
- **Hissing Sound:** Stop before air pushes through
- **No Plunger Bounce:** Indicates proper grind size`,

  'Espresso': `You are an expert espresso brewing consultant with deep knowledge of:

## Espresso Fundamentals
- **Pressure:** 9 bars (± 1 bar) for traditional espresso
- **Temperature:** 90-96°C at group head
- **Grind Size:** Very fine (powdered sugar texture)
- **Brew Ratio:** 1:2 to 1:3 (coffee to beverage weight)
- **Brew Time:** 25-35 seconds for traditional espresso

## Espresso Variables (The Trinity)

### Dose
- **Standard:** 18-20g for double basket
- **Single:** 7-9g for single basket
- **Adjust:** Based on basket size and desired strength

### Yield
- **Traditional Ratio:** 1:2 (18g in → 36g out)
- **Ristretto:** 1:1.5 (18g → 27g)
- **Lungo:** 1:3 (18g → 54g)

### Time
- **Target:** 25-30 seconds
- **Fast (<25s):** Grind finer or increase dose
- **Slow (>35s):** Grind coarser or decrease dose

## Dialing In Process

1. **Start with ratio:** Choose target ratio (e.g., 1:2)
2. **Adjust grind:** Achieve 25-30 second extraction
3. **Taste:** Identify extraction issues
4. **Fine-tune:** Adjust one variable at a time

## Extraction Indicators

### Under-Extracted (Sour/Sharp)
- Increase brew time (grind finer)
- Increase temperature (+1-2°C)
- Increase yield ratio slightly

### Over-Extracted (Bitter/Astringent)
- Decrease brew time (grind coarser)
- Decrease temperature (-1-2°C)
- Decrease yield ratio

### Channeling
- Even distribution crucial
- WDT (Weiss Distribution Technique)
- Consistent tamping pressure (15-30 lbs)
- Level tamp essential

## Roast-Specific Parameters

### Light Roasts
- Temperature: 94-96°C
- Longer preinfusion (5-10 seconds)
- Slightly finer grind
- May need higher ratio (1:2.5)

### Medium Roasts
- Temperature: 92-94°C
- Standard parameters
- Classic 1:2 ratio

### Dark Roasts
- Temperature: 88-92°C
- Coarser grind (relative to light)
- May prefer shorter ratio (1:1.5-1:2)

## Pressure Profiling (if available)

### Classic Profile
- 9 bars constant throughout

### Declining Profile
- Start 9 bars → decline to 6 bars
- Reduces channeling and astringency

### Blooming Profile
- 2-3 bars preinfusion (5-10s)
- Ramp to 9 bars
- Improves extraction uniformity`,

  'Moka Pot': `You are an expert Moka Pot brewing consultant with deep knowledge of:

## Moka Pot Characteristics
- **Pressure Brewing:** ~1.5 bars pressure (not espresso level)
- **Steam Driven:** Boiling water creates pressure
- **Bold Extraction:** Concentrated, full-bodied coffee
- **Heat Source Dependent:** Stovetop temperature control crucial
- **Typical Sizes:** 1-cup (60ml), 3-cup (180ml), 6-cup (300ml)

## Moka Pot Fundamentals
- **Grind Size:** Medium-fine (between espresso and drip)
- **Water Temp:** Start with hot water in bottom chamber
- **Coffee Dose:** Fill basket level, no tamping
- **Brew Time:** 4-5 minutes total
- **Heat Level:** Medium-low to medium heat

## Critical Moka Pot Techniques

### Proper Setup
1. Use pre-boiled water in bottom chamber (below valve)
2. Fill basket to top, level off (don't tamp)
3. Ensure clean gasket and filter plate
4. Tight but not over-tight assembly
5. Medium-low heat (prevents burning)

### Brewing Process
1. Place on heat, lid open to watch
2. Coffee should flow slowly and steadily
3. When you hear hissing/sputtering, remove from heat
4. Close lid, let residual pressure finish
5. Run pot under cold water to stop extraction

### Temperature Management
- **Too Hot:** Bitter, burnt taste; fast, violent extraction
- **Too Cool:** Slow or incomplete extraction
- **Optimal:** Steady, honey-like flow

## Common Issues & Solutions

### Burnt/Bitter Taste
- Heat too high → reduce heat level
- Over-extraction → remove earlier from heat
- Stale coffee oils in pot → deep clean

### Weak/Watery
- Grind too coarse → grind finer
- Not enough heat → increase slightly
- Underfilled basket → fill to top

### Coffee Spurting Violently
- Heat way too high → much lower heat
- Gasket seal issue → check/replace gasket

### Slow or No Flow
- Grind too fine → grind coarser
- Coffee tamped → never tamp, just level
- Clogged filter → clean thoroughly

## Roast Recommendations
- **Light Roasts:** Not ideal (moka tends to under-extract)
- **Medium Roasts:** Excellent choice
- **Dark Roasts:** Traditional Italian style, very good
- **Espresso Roasts:** Specifically designed for moka

## Moka Pot Maintenance
- Clean after every use
- Deep clean weekly with baking soda
- Replace gasket annually
- Never use soap (retains taste)
- Check pressure valve regularly`,

  'default': `You are an expert coffee brewing consultant with deep knowledge of various brewing methods including pour-over, immersion, pressure, and hybrid techniques. You understand:

## Universal Brewing Principles
- Grind size impact on extraction rate
- Water temperature effects on solubility
- Brew time and extraction balance
- Coffee-to-water ratios for strength
- Agitation and turbulence effects
- Filter types and their impact on body/clarity

## Method-Specific Optimization
You adapt recommendations based on:
- Brewing method characteristics (immersion vs percolation vs pressure)
- Filter type (paper, metal, cloth)
- Flow rate and drainage patterns
- Temperature stability during brewing
- Technique sensitivity vs forgiveness

## Roast Level Adjustments
- **Light Roasts:** Higher temps, finer grinds, longer contact time
- **Medium Roasts:** Standard parameters
- **Dark Roasts:** Lower temps, coarser grinds, shorter contact time

## Coffee Age Considerations
- **0-3 days:** May need degassing
- **4-14 days:** Peak flavor window
- **15-30 days:** Still excellent
- **30+ days:** May be staling, adjust technique`
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
    console.log('Received brew recipe request:', body)
    
    const { 
      coffee_name, 
      coffee_origin,
      roast_level, 
      roast_date, 
      processing_method,
      brew_method, 
      brew_equipment_brand,
      brew_equipment_model,
      grind_size, 
      water_temp, 
      brew_ratio, 
      dose_grams,
      target_extraction,
      water_quality, // 'tap', 'filtered', 'bottled', 'remineralized'
      grinder_type, // 'blade', 'burr_hand', 'burr_electric', 'commercial'
      grinder_brand,
      grinder_model,
      previous_brews = [],
      user_experience_level // 'beginner', 'intermediate', 'advanced'
    } = body

    // Validate required fields
    if (!coffee_name || !roast_level || !roast_date || !brew_method) {
      return NextResponse.json({ 
        error: 'Missing required fields: coffee_name, roast_level, roast_date, brew_method' 
      }, { status: 400 })
    }

    // Get user from session
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

    // Calculate coffee age
    const roastDateObj = new Date(roast_date)
    const today = new Date()
    const daysOld = Math.floor((today.getTime() - roastDateObj.getTime()) / (1000 * 60 * 60 * 24))

    // Determine brewing equipment and select appropriate system prompt
    let equipmentKey = brew_method
    if (brew_equipment_brand && brew_equipment_model) {
      equipmentKey = `${brew_equipment_brand} ${brew_equipment_model}`
    }
    
    const systemPrompt = (BREWING_PROMPTS as any)[equipmentKey] || BREWING_PROMPTS['default']

    // Determine detail level based on experience
    const detailLevel = user_experience_level === 'beginner' 
      ? 'Include detailed step-by-step instructions with timing, visual cues, and what to watch for at each stage.'
      : user_experience_level === 'advanced'
      ? 'Focus on parameters and key technique points. Assume familiarity with basics.'
      : 'Provide clear guidance with important technique notes and timing windows.'

    // Build comprehensive context for Claude
    const context = `
# Coffee Brewing Recipe Request

## Coffee Profile:
- **Name:** ${coffee_name}
- **Origin:** ${coffee_origin || 'Not specified'}
- **Roast Level:** ${roast_level}
- **Processing Method:** ${processing_method || 'Not specified'}
- **Days since roast:** ${daysOld} days

## Brewing Setup:
- **Method:** ${brew_method}
- **Equipment:** ${brew_equipment_brand && brew_equipment_model ? `${brew_equipment_brand} ${brew_equipment_model}` : 'Standard ' + brew_method}
- **Grinder Type:** ${grinder_type || 'Not specified'}
- **Water Quality:** ${water_quality || 'Not specified'}

## Current Parameters:
- **Dose:** ${dose_grams ? dose_grams + 'g' : 'not specified'}
- **Grind Size:** ${grind_size || 'not specified'}
- **Water Temp:** ${water_temp ? water_temp + '°C' : 'not specified'}
- **Brew Ratio:** ${brew_ratio ? `1:${brew_ratio}` : 'not specified'}
- **Target Extraction:** ${target_extraction || 'balanced'}

## Experience Level:
- **User Level:** ${user_experience_level || 'intermediate'}
- **Detail Needed:** ${detailLevel}

## Previous Brew Attempts:
${previous_brews.length > 0 ? previous_brews.map((brew: any, i: number) => 
  `${i + 1}. Grind: ${brew.grind_size}, Ratio: 1:${brew.ratio}, Temp: ${brew.water_temp}°C, Time: ${brew.brew_time}, Rating: ${brew.rating}/5, Notes: ${brew.notes || 'none'}`
).join('\n') : 'No previous attempts recorded'}
`

    // Build equipment-specific user prompt
    const userPrompt = `${systemPrompt}

${context}

Create a detailed, equipment-specific brewing recipe optimized for the ${brew_equipment_brand && brew_equipment_model ? `${brew_equipment_brand} ${brew_equipment_model}` : brew_method}.

**Recipe Requirements:**

1. **Coffee & Equipment Analysis**
   - Analyze coffee characteristics (roast level, age, processing, origin)
   - **Origin-Specific Considerations:**
     ${coffee_origin && coffee_origin !== 'Not specified' ? `
     * **${coffee_origin} Coffee Characteristics:** Consider typical flavor profiles, acidity levels, and brewing considerations for ${coffee_origin} coffees
     * **Regional Processing Variations:** Account for how ${coffee_origin} processing methods affect extraction
     * **Terroir Impact:** Consider how ${coffee_origin} altitude, climate, and soil affect brewing parameters
     ` : '* General coffee analysis without specific origin considerations'}
   - **Processing Method Impact:**
     ${processing_method && processing_method !== 'Not specified' ? `
     * **${processing_method} Process:** Adjust parameters for ${processing_method} processing characteristics
     * **Density & Porosity:** Consider how ${processing_method} affects bean structure and extraction
     * **Optimal Extraction:** Tailor grind size and water temperature for ${processing_method} coffees
     ` : '* Standard processing considerations'}
   - Consider equipment-specific features and capabilities
   - ${detailLevel}
   - Account for grinder type limitations and specific model characteristics

2. **Optimal Parameters**
   - **Grind Size:** Specific texture description AND grinder-specific setting recommendations
     ${grinder_type && grinder_type !== 'Not specified' ? `
     * For ${grinder_type} (${grinder_brand || ''} ${grinder_model || ''}): Provide specific grind setting guidance
     * Account for ${grinder_type} characteristics (burr type, adjustment mechanism, consistency)
     ` : '* General grind size recommendations'}
   - **Dose:** Optimal amount for this equipment and brew size
   - **Water Temperature:** Specific target based on roast level, origin characteristics, and processing method
   - **Brew Ratio:** Specific ratio for desired strength, adjusted for coffee origin and processing
   - **Water Quality:** Impact and recommendations

3. **Step-by-Step Brewing Instructions**
   Equipment-specific technique for ${brew_equipment_brand && brew_equipment_model ? `${brew_equipment_brand} ${brew_equipment_model}` : brew_method}:
   - Preparation and setup steps
   - Timing for each stage
   - Pour pattern or technique details (if applicable)
   - Visual and sensory cues to watch for
   - ${detailLevel}

4. **Expected Outcomes**
   - Flavor profile based on roast level and coffee age
   - Mouthfeel and body characteristics
   - Optimal serving/drinking temperature
   - Brew time targets

5. **Troubleshooting Guide**
   Equipment-specific solutions for:
   - **Sour/Under-extracted:** Causes and adjustments
   - **Bitter/Over-extracted:** Causes and adjustments
   - **Weak/Thin:** Causes and adjustments
   - **Muddy/Cloudy:** Causes and adjustments (if applicable)
   - **Channeling/Uneven:** Equipment-specific fixes

6. **Coffee Age Considerations**
   ${daysOld <= 3 ? 'This is very fresh coffee - provide degassing recommendations' : ''}
   ${daysOld > 30 ? 'This coffee is aging - provide freshness optimization tips' : ''}

7. **Iterative Improvement**
   ${previous_brews.length > 0 ? `Based on previous attempts, provide specific adjustments to improve results.` : 'Provide guidance for dialing in through multiple brews.'}

Respond in JSON format:
{
  "equipment_analysis": {
    "brewing_method": "${brew_method}",
    "equipment_specific_notes": "key features and considerations for this equipment",
    "filter_type": "paper/metal/cloth and impact on brew",
    "optimal_batch_size": "recommended dose range"
  },
  "optimal_parameters": {
    "grind_size": "specific texture AND relative setting guidance",
    "dose_grams": 18,
    "water_temp_celsius": 93,
    "brew_ratio": 16,
    "total_water_grams": 288,
    "water_quality_notes": "impact and recommendations"
  },
  "brewing_steps": [
    {
      "step_number": 1,
      "time": "0:00",
      "action": "detailed instruction",
      "visual_cues": "what to look for",
      "notes": "technique tips"
    }
  ],
  "timing_targets": {
    "bloom_time": "30-45 seconds",
    "total_brew_time": "3:00-3:30",
    "stages": ["bloom: 0:00-0:45", "main pour: 0:45-2:30", "drainage: 2:30-3:30"]
  },
  "expected_flavor": {
    "taste_notes": "expected flavor based on roast and age",
    "body": "light/medium/full",
    "mouthfeel": "texture description",
    "optimal_serving_temp": "temperature range"
  },
  "troubleshooting": {
    "sour_under_extracted": "specific equipment adjustments",
    "bitter_over_extracted": "specific equipment adjustments",
    "weak_thin": "specific equipment adjustments",
    "equipment_specific_issues": "common problems and solutions"
  },
  "coffee_age_notes": "recommendations based on ${daysOld} days old",
  "improvement_tips": ${previous_brews.length > 0 ? '"specific adjustments based on previous attempts"' : '"how to dial in over multiple brews"'},
  "advanced_techniques": "optional variations or advanced methods for this equipment"
}`

    // Call Claude API
    console.log(`Generating brew recipe with Claude for ${equipmentKey}`)
    console.log('Claude API request body:', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: userPrompt.substring(0, 500) + '...' }]
    })
    
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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
        recommendation_type: 'brew_recipe',
        input_context: {
          coffee_name,
          coffee_origin,
          roast_level,
          roast_date,
          processing_method,
          brew_method,
          brew_equipment_brand,
          brew_equipment_model,
          grind_size,
          water_temp,
          brew_ratio,
          dose_grams,
          target_extraction,
          water_quality,
          grinder_type,
          previous_brews,
          user_experience_level
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
      recommendation: parsedRecommendation,
      context: {
        coffee_age_days: daysOld,
        is_fresh: daysOld <= 3,
        is_aging: daysOld > 30,
        equipment_type: equipmentKey,
        equipment_specific: equipmentKey !== brew_method,
        experience_level: user_experience_level || 'intermediate'
      }
    })

  } catch (error) {
    console.error('Brew recipe API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate brew recommendation', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}