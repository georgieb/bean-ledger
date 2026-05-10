import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkBudget, recordUsage } from '@/lib/ai-budget'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
      roast_data,
      coffee_origin,
      bean_density,
      target_roast_level,
      equipment_settings,
      previous_roasts = []
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

    const budget = await checkBudget('roast_profile')
    if (!budget.allowed) {
      return NextResponse.json(
        { error: `Daily AI budget reached. Resets at midnight. Remaining: $${budget.remaining}` },
        { status: 429 }
      )
    }

    // Build context for Claude
    const context = `
Roast Profile Analysis Request:

Current Roast Data:
- Green Coffee: ${coffee_origin || 'Not specified'}
- Bean Density: ${bean_density || 'Unknown'}
- Target Roast Level: ${target_roast_level}
- Green Weight: ${roast_data.green_weight}g
- Roasted Weight: ${roast_data.roasted_weight}g
- Weight Loss: ${roast_data.weight_loss_percentage}%
- Total Roast Time: ${roast_data.total_roast_time} minutes
- First Crack Start: ${roast_data.first_crack_start || 'Not recorded'}
- First Crack End: ${roast_data.first_crack_end || 'Not recorded'}
- Development Time: ${roast_data.development_time || 'Not recorded'}
- Drop Temperature: ${roast_data.drop_temp || 'Not recorded'}°C
- Charge Temperature: ${roast_data.charge_temp || 'Not recorded'}°C

Equipment Settings:
${equipment_settings ? Object.entries(equipment_settings).map(([key, value]) => `- ${key}: ${value}`).join('\\n') : 'Not provided'}

Previous Roast History:
${previous_roasts.length > 0 ? previous_roasts.map((roast: any, i: number) => 
  `${i + 1}. ${roast.coffee_name}: ${roast.roast_level}, Weight loss: ${roast.weight_loss}%, Time: ${roast.total_time}min, Rating: ${roast.rating || 'N/A'}/5`
).join('\\n') : 'No previous roasts recorded'}

Roast Quality Indicators:
- Aroma Notes: ${roast_data.aroma_notes || 'Not recorded'}
- Bean Color (before): ${roast_data.bean_color_before || 'Not recorded'}
- Bean Color (after): ${roast_data.bean_color_after || 'Not recorded'}
- Cupping Score: ${roast_data.cupping_score || 'Not recorded'}
- Defects: ${roast_data.defects || 'None noted'}
`

    // Call Claude API
    console.log('Calling Claude API for roast analysis')
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `As a coffee roasting expert, analyze this roast profile. Keep all string values to 1-2 sentences. Respond with ONLY a JSON object — no markdown.

${context}

Benchmarks: light roast 12-15% loss, medium 15-18%, dark 18-22%. Development time should be 15-25% of total time.

{
  "overall_rating": 7,
  "roast_quality": "1-2 sentence assessment",
  "development_analysis": "1-2 sentences on development phase",
  "weight_loss_assessment": "1-2 sentences on weight loss",
  "temperature_feedback": "1-2 sentences on temperatures",
  "identified_issues": ["issue 1", "issue 2"],
  "next_roast_recommendations": ["rec 1", "rec 2", "rec 3"],
  "flavor_impact": "1-2 sentences on flavor",
  "equipment_adjustments": "1-2 sentences on equipment",
  "success_indicators": ["success 1", "success 2"]
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

    await recordUsage(user.id, 'roast_profile', {
      roast_data, coffee_origin, bean_density,
      target_roast_level, equipment_settings, previous_roasts
    }, parsedRecommendation)

    return NextResponse.json({
      success: true,
      analysis: parsedRecommendation,
      roast_metrics: {
        weight_loss_percentage: roast_data.weight_loss_percentage,
        roast_efficiency: calculateRoastEfficiency(roast_data),
        development_ratio: calculateDevelopmentRatio(roast_data)
      }
    })

  } catch (error) {
    console.error('Roast profile API error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze roast profile' }, 
      { status: 500 }
    )
  }
}

// Helper function to calculate roast efficiency
function calculateRoastEfficiency(roastData: any): number {
  // Simple efficiency metric based on time and weight loss
  if (!roastData.total_roast_time || !roastData.weight_loss_percentage) {
    return 0
  }
  
  const timeMinutes = parseFloat(roastData.total_roast_time)
  const weightLoss = parseFloat(roastData.weight_loss_percentage)
  
  // Efficiency = weight loss achieved per minute (higher is more efficient)
  return Math.round((weightLoss / timeMinutes) * 10) / 10
}

// Helper function to calculate development ratio
function calculateDevelopmentRatio(roastData: any): number {
  if (!roastData.development_time || !roastData.total_roast_time) {
    return 0
  }
  
  const devTime = parseFloat(roastData.development_time)
  const totalTime = parseFloat(roastData.total_roast_time)
  
  return Math.round((devTime / totalTime) * 100)
}