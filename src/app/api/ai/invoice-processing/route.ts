import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

// Max invoice AI scans per user per day (~$0.003 max cost at haiku pricing)
const DAILY_LIMIT = 5

export async function POST(request: NextRequest) {
  try {
    if (!anthropicApiKey) {
      return NextResponse.json({
        error: 'AI features not configured. Please set ANTHROPIC_API_KEY environment variable.'
      }, { status: 503 })
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

    // Check daily usage limit
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)
    const { count } = await supabaseAdmin
      .from('ai_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('recommendation_type', 'invoice_processing')
      .gte('created_at', todayStart.toISOString())

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily invoice scan limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
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
              text: 'Extract green coffee purchase info from this invoice. Return JSON only (no extra text):\n\n{"name":"coffee name or null","origin":"country/region or null","farm":"farm name or null","variety":"variety or null","process":"washed|natural|honey|etc or null","weight":grams_as_number_or_null,"cost":usd_as_number_or_null,"purchase_date":"YYYY-MM-DD or null","supplier":"name or null","notes":"brief notes or null","confidence":"high|medium|low","extracted_text":"brief summary of visible text"}\n\nIf invoice has multiple items, return a JSON array of objects with the same shape.'
            }
          ]
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const response = claudeData.content[0].text

    let extractedData
    try {
      const jsonMatches = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
      if (jsonMatches && jsonMatches.length > 0) {
        const allItems = jsonMatches
          .map((s: string) => { try { return JSON.parse(s) } catch { return null } })
          .filter(Boolean)
        if (allItems.length === 0) throw new Error('No valid JSON objects found')
        extractedData = allItems
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError, response)
      return NextResponse.json({
        error: 'Failed to parse invoice data',
        raw_response: response
      }, { status: 500 })
    }

    // Log usage for rate limiting
    await supabaseAdmin.from('ai_recommendations').insert({
      user_id: user.id,
      recommendation_type: 'invoice_processing',
      input_context: { filename: image.name, size: image.size },
      recommendation: JSON.stringify(extractedData)
    })

    return NextResponse.json({ success: true, extracted_data: extractedData })

  } catch (error) {
    console.error('Invoice processing error:', error)
    return NextResponse.json({ error: 'Failed to process invoice image' }, { status: 500 })
  }
}
