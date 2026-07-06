import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkBudget, recordUsage } from '@/lib/ai-budget'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const anthropicApiKey = process.env.APP_ANTHROPIC_KEY
    if (!anthropicApiKey) {
      return NextResponse.json({ error: 'AI features not configured.' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Global daily budget check
    const budget = await checkBudget('bean_analysis')
    if (!budget.allowed) {
      return NextResponse.json(
        { error: `Daily AI budget reached. Resets at midnight. Remaining: $${budget.remaining}` },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    const context = formData.get('context') as string | null

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')

    const contextNote = context ? `\nAdditional context from the roaster: ${context}` : ''

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.type, data: base64Image }
            },
            {
              type: 'text',
              text: `You are an expert coffee roaster analyzing a photo of coffee beans. Assess what you see and give actionable feedback.${contextNote}

Return ONLY a JSON object with this exact shape:
{
  "roast_level_estimate": "green | light | medium-light | medium | medium-dark | dark | very-dark",
  "color_uniformity": "excellent | good | fair | poor",
  "surface_appearance": "matte | slightly-oily | oily | very-oily",
  "visible_defects": ["list any visible defects, or empty array if none"],
  "development_assessment": "1-2 sentences on how developed the roast looks",
  "flavor_prediction": "1-2 sentences predicting likely cup flavor based on visual roast level",
  "recommendations": ["up to 3 specific actionable tips based on what you see"],
  "overall_assessment": "1-2 sentence overall verdict",
  "confidence": "high | medium | low"
}`
            }
          ]
        }]
      })
    })

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content[0].text

    let analysis
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      analysis = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse analysis', raw: responseText }, { status: 500 })
    }

    await recordUsage(user.id, 'bean_analysis', { filename: image.name, size: image.size, context }, analysis)

    return NextResponse.json({ success: true, analysis })

  } catch (error) {
    console.error('Bean analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze bean photo' }, { status: 500 })
  }
}
