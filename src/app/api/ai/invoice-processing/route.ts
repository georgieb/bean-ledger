import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkBudget, recordUsage } from '@/lib/ai-budget'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const anthropicApiKey = process.env.APP_ANTHROPIC_KEY
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

    // Global daily budget check
    const budget = await checkBudget('invoice_processing')
    if (!budget.allowed) {
      return NextResponse.json(
        { error: `Daily AI budget reached. Resets at midnight. Remaining: $${budget.remaining}` },
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
              text: 'Extract green coffee purchase info from this invoice. Return JSON only (no extra text):\n\n{"name":"coffee name or null","origin":"country/region or null","farm":"farm name or null","variety":"variety or null","process":"washed|natural|honey|etc or null","weight":grams_as_number_or_null,"cost":usd_as_number_or_null,"purchase_date":"YYYY-MM-DD or null","supplier":"name or null","notes":"brief notes or null","confidence":"high|medium|low","extracted_text":"brief summary of visible text"}\n\nIf invoice has multiple items, return a JSON array of objects with the same shape.'
            }
          ]
        }]
      })
    })

    if (!claudeResponse.ok) {
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

    await recordUsage(user.id, 'invoice_processing', { filename: image.name, size: image.size }, extractedData)

    return NextResponse.json({ success: true, extracted_data: extractedData })

  } catch (error) {
    console.error('Invoice processing error:', error)
    return NextResponse.json({ error: 'Failed to process invoice image' }, { status: 500 })
  }
}
