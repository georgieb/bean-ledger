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

    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get('content-type')
    let roast_data, coffee_origin, bean_density, target_roast_level, equipment_settings, previous_roasts = [], roast_image = null

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with image)
      const formData = await request.formData()
      roast_data = JSON.parse(formData.get('roast_data') as string)
      coffee_origin = formData.get('coffee_origin') as string
      bean_density = formData.get('bean_density') as string
      target_roast_level = formData.get('target_roast_level') as string
      equipment_settings = JSON.parse(formData.get('equipment_settings') as string || '{}')
      previous_roasts = JSON.parse(formData.get('previous_roasts') as string || '[]')
      roast_image = formData.get('roast_image') as File | null
    } else {
      // Handle JSON (no image)
      const body = await request.json()
      roast_data = body.roast_data
      coffee_origin = body.coffee_origin
      bean_density = body.bean_density
      target_roast_level = body.target_roast_level
      equipment_settings = body.equipment_settings
      previous_roasts = body.previous_roasts || []
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

    // Prepare message content
    const analysisPrompt = `As a coffee roasting expert, analyze this roast profile and provide detailed feedback:

${context}

Please provide a comprehensive analysis including:

1. **Roast Quality Assessment**: Rate the roast execution (1-10) and explain why
2. **Development Analysis**: Evaluate the development time ratio and first crack timing
3. **Weight Loss Evaluation**: Assess weight loss in context of visual evidence, bean origin, and processing method. If visual shows proper development, acknowledge that weight loss varies widely.
4. **Temperature Profile**: Comment on charge/drop temperatures and heat application
5. **Identified Issues**: Any problems or areas for improvement
6. **Next Roast Recommendations**: Specific adjustments for the next roast
7. **Bean Character**: How this roast likely affects the coffee's flavor profile
8. **Equipment Optimization**: Suggested equipment setting adjustments
${roast_image ? '\n9. **Visual Bean Analysis**: MOST IMPORTANT - Based on the uploaded image, determine the actual roast level from bean color and surface characteristics. This overrides any weight loss calculations.' : ''}

CRITICAL: When analyzing roasts with images, visual evidence ALWAYS takes priority over numerical data.

Focus on actionable insights and use this hierarchy:
1. VISUAL EVIDENCE: Bean color and surface development are the definitive roast level indicators
2. Sensory context: Processing method, origin, and density affect weight loss patterns
3. Guidelines only: Light (12-15%), Medium (15-18%), Dark (18-22%) weight loss are rough estimates
4. Development time should be 15-25% of total roast time
5. First crack timing indicates heat application rate

IMPORTANT: If the image shows medium roast characteristics (brown color, some surface oils, proper development) but weight loss is lower than "typical," the roast IS properly developed. Many factors affect weight loss including bean density, processing method, and initial moisture content.

Respond in JSON format:
{
  "overall_rating": "number from 1-10",
  "roast_quality": "brief quality assessment",
  "development_analysis": "analysis of development phase",
  "weight_loss_assessment": "evaluation of weight loss percentage", 
  "temperature_feedback": "comments on temperature profile",
  "identified_issues": ["issue 1", "issue 2", ...],
  "next_roast_recommendations": ["recommendation 1", "recommendation 2", ...],
  "flavor_impact": "expected flavor characteristics",
  "equipment_adjustments": "suggested equipment setting changes",
  "success_indicators": ["what went well 1", "what went well 2", ...],
  ${roast_image ? '"visual_analysis": "detailed analysis of bean color, evenness, and visual quality from the uploaded image",' : ''}
}`

    // Prepare message content with or without image
    let messageContent: any[]
    
    if (roast_image) {
      // Convert image to base64 for Claude vision
      const imageBuffer = await roast_image.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const imageType = roast_image.type
      
      messageContent = [
        {
          type: 'text',
          text: analysisPrompt
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageType,
            data: base64Image
          }
        }
      ]
    } else {
      messageContent = [{ type: 'text', text: analysisPrompt }]
    }

    // Call Claude API
    console.log('Calling Claude API for roast analysis', roast_image ? 'with image' : 'text only')
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: roast_image ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307', // Use working models
        max_tokens: roast_image ? 1500 : 1200, // More tokens for image analysis
        messages: [{
          role: 'user',
          content: messageContent
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      throw new Error(`Claude API error: ${claudeResponse.status} ${claudeResponse.statusText}`)
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
        recommendation_type: 'roast_profile',
        input_context: {
          roast_data,
          coffee_origin,
          bean_density,
          target_roast_level,
          equipment_settings,
          previous_roasts
        },
        recommendation: parsedRecommendation
      })
      .select()
      .single()

    if (dbError) {
      console.warn('Database save failed (non-critical):', dbError)
    }

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