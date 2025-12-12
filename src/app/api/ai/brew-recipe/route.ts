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
      coffee_name, 
      roast_level, 
      roast_date, 
      brew_method, 
      grind_size, 
      water_temp, 
      brew_ratio, 
      target_extraction,
      previous_brews = []
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

    // Calculate coffee age
    const roastDateObj = new Date(roast_date)
    const today = new Date()
    const daysOld = Math.floor((today.getTime() - roastDateObj.getTime()) / (1000 * 60 * 60 * 24))

    // Build context for Claude
    const context = `
Coffee Profile:
- Name: ${coffee_name}
- Roast Level: ${roast_level}
- Days since roast: ${daysOld}

Brewing Parameters:
- Method: ${brew_method}
- Current grind size: ${grind_size || 'not specified'}
- Current water temp: ${water_temp || 'not specified'}°
- Current ratio: ${brew_ratio ? `1:${brew_ratio}` : 'not specified'}
- Target extraction: ${target_extraction || 'balanced'}

Previous brew attempts:
${previous_brews.length > 0 ? previous_brews.map((brew: any, i: number) => 
  `${i + 1}. Grind: ${brew.grind_size}, Ratio: 1:${brew.ratio}, Rating: ${brew.rating}/5, Notes: ${brew.notes}`
).join('\\n') : 'None recorded'}
`

    // Call Claude API
    console.log('Calling Claude API with model: claude-3-5-sonnet-20241022')
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `As a coffee brewing expert, analyze this coffee and provide specific brewing recommendations for the ${brew_method} method:

${context}

Please provide equipment-agnostic recommendations that work with any brand or model of brewing equipment. Focus on universal brewing principles rather than specific equipment settings.

Please provide:
1. Optimal grind size (describe texture: coarse, medium-coarse, medium, medium-fine, fine, extra-fine)
2. Recommended water temperature range
3. Suggested brew ratio
4. Step-by-step brewing technique applicable to any ${brew_method} equipment
5. Expected flavor profile based on the roast level and coffee age
6. Troubleshooting tips that apply regardless of equipment brand
7. Timing and technique recommendations

Focus on practical, actionable advice. If this is a fresh roast (0-3 days), recommend letting it degas. Consider the roast level when suggesting extraction parameters. Provide grind recommendations using texture descriptions that work with any grinder, not specific numeric settings.

Respond in JSON format with these fields:
{
  "grind_recommendation": "grind texture description (e.g., 'medium-fine, similar to table salt') applicable to any grinder",
  "water_temp": "temperature range in celsius (e.g., '92-96')",
  "brew_ratio": "ratio as number (e.g. 15 for 1:15)",
  "brewing_steps": ["step 1", "step 2", ...],
  "expected_flavor": "description of expected taste based on roast level and age",
  "troubleshooting": "equipment-agnostic tips based on context",
  "degassing_note": "advice about coffee age and degassing if relevant"
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
      // Extract JSON from Claude's response (it might include markdown formatting)
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
        recommendation_type: 'brew_recipe',
        input_context: {
          coffee_name,
          roast_level,
          roast_date,
          brew_method,
          grind_size,
          water_temp,
          brew_ratio,
          target_extraction,
          previous_brews
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
        is_fresh: daysOld <= 3
      }
    })

  } catch (error) {
    console.error('Brew recipe API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate brew recommendation' }, 
      { status: 500 }
    )
  }
}