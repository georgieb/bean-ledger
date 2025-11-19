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
          content: `You are an expert coffee roasting consultant specializing in equipment-specific roast profile generation. Create a detailed, step-by-step roast profile based on the provided information.

${context}

Please provide a comprehensive roast profile including:

1. **Bean Analysis**: Brief analysis of the green coffee characteristics and expected behavior
2. **Equipment-Specific Protocol**: Safety protocols and equipment-specific considerations
3. **Step-by-Step Profile**: Time-based settings with equipment controls
4. **Expected Outcomes**: Flavor profile and roast characteristics
5. **Troubleshooting Tips**: Common issues and adjustments

Equipment-specific guidelines:
- Use the equipment's available control ranges and settings
- Provide timing appropriate for the equipment type
- Include safety considerations for that specific roaster
- Adapt heat and airflow controls to equipment capabilities
- Consider batch size limits and optimal ranges for the equipment

Respond in JSON format:
{
  "bean_analysis": "analysis of green coffee characteristics",
  "equipment_protocol": "equipment-specific safety protocols and setup",
  "roast_profile": [
    {
      "time": "0:00",
      "settings": {"heat": 5, "airflow": 7},
      "temperature": "ambient",
      "notes": "Initial setup phase"
    }
  ],
  "expected_flavor": "expected flavor characteristics",
  "troubleshooting": "common issues and adjustments",
  "total_duration": "8:30-10:30",
  "critical_timings": ["First crack: 4:00-6:00", "Development: 1:30-2:30 post-FC"]
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