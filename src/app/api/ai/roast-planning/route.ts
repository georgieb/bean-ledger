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
      has_extension_tube,
      user_preferences
    } = body

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

    // Build comprehensive context for Claude
    const context = `
# Coffee Roasting Profile Generation Request

## Equipment Details:
- **Roaster:** ${equipment_brand} ${equipment_model}
- **Extension Tube:** ${has_extension_tube ? 'Yes' : 'No'}
- **Equipment Settings Schema:** ${JSON.stringify(equipment_settings, null, 2)}

## Green Coffee Information:
- **Coffee Name:** ${green_coffee_name}
- **Origin:** ${green_coffee_origin}
- **Processing Method:** ${processing_method || 'Unknown'}
- **Altitude:** ${altitude || 'Unknown'} meters
- **Batch Weight:** ${batch_weight}g

## Roasting Parameters:
- **Roast Goal:** ${roast_goal}
- **Room Temperature:** ${room_temperature}°F
- **User Preferences:** ${JSON.stringify(user_preferences, null, 2)}

## Equipment-Specific Requirements:
- **Equipment Type:** ${equipment_brand} ${equipment_model}
- **Available Controls:** Based on equipment settings schema
- **Batch Size Optimization:** Adapt for equipment capacity
- **Safety Protocols:** Equipment-appropriate operating procedures
`

    // Call Claude API with roasting expertise
    console.log('Generating roast profile with Claude')
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert coffee roasting consultant specializing in universal roast profile generation. Create a detailed, step-by-step roast profile that can be adapted to various roasting equipment.

${context}

Please provide a comprehensive roast profile that works across different roaster types and brands. Focus on universal roasting principles rather than equipment-specific numeric settings.

Provide:

1. **Bean Analysis**: Analysis of the green coffee characteristics and expected behavior during roasting
2. **Universal Protocol**: General safety protocols and roasting considerations applicable to any drum roaster
3. **Step-by-Step Profile**: Time-based milestones with relative heat/airflow adjustments (e.g., "high heat", "medium airflow")
4. **Expected Outcomes**: Flavor profile and roast characteristics based on the target roast level
5. **Troubleshooting Tips**: Common issues and adjustments that apply to any roaster

Universal roasting guidelines:
- Provide heat settings as relative levels (low, medium-low, medium, medium-high, high) not numeric values
- Describe airflow in relative terms (low, moderate, high) not equipment-specific numbers
- Focus on temperature milestones and timing that work for any roaster
- Include universal safety considerations (bean temperature monitoring, smoke management, cooling)
- Provide batch size as a percentage of roaster capacity rather than specific weights
- Emphasize technique and timing over equipment-specific controls

Respond in JSON format:
{
  "bean_analysis": "analysis of green coffee characteristics and expected roast development",
  "equipment_protocol": "universal safety protocols and general setup applicable to any drum roaster",
  "roast_profile": [
    {
      "time": "0:00",
      "settings": {"heat": "medium-high", "airflow": "moderate"},
      "temperature": "ambient to 150°C",
      "notes": "Initial heat application and drying phase"
    }
  ],
  "expected_flavor": "expected flavor characteristics for the target roast level",
  "troubleshooting": "universal tips for common roasting issues",
  "total_duration": "8:30-10:30",
  "critical_timings": ["First crack: 4:00-6:00", "Development: 1:30-2:30 post-FC", "Target drop temp: 200-210°C"]
}`
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
      // Extract JSON from Claude's response
      const jsonMatch = recommendation.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedRecommendation = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      // If parsing fails, return raw recommendation
      parsedRecommendation = {
        recommendation_text: recommendation,
        error: 'Failed to parse structured response'
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
          has_extension_tube,
          user_preferences
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
        has_extension: has_extension_tube
      }
    })

  } catch (error) {
    console.error('Roast planning API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate roast profile' }, 
      { status: 500 }
    )
  }
}