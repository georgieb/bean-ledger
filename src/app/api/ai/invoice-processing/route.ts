import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Invoice processing API called')
    
    if (!anthropicApiKey) {
      return NextResponse.json({ 
        error: 'AI features not configured. Please set ANTHROPIC_API_KEY environment variable.' 
      }, { status: 503 })
    }

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
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

    const formData = await request.formData()
    const image = formData.get('image') as File
    
    console.log('Image received:', image ? `${image.name} (${image.size} bytes)` : 'none')
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')

    // Call Claude API for image analysis
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.type,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: 'You are an expert at extracting green coffee purchase information from invoices and receipts. Please analyze this image and extract the following information for green coffee purchases:\n\n1. Coffee Name (product name)\n2. Origin (country/region)\n3. Farm name (if mentioned)\n4. Variety (coffee variety/cultivar)\n5. Process method (washed, natural, honey, etc.)\n6. Weight in grams\n7. Cost/Price in USD\n8. Purchase date\n9. Supplier name\n10. Any relevant notes about flavor, quality, etc.\n\nPlease be thorough and extract all available information. If information is not clearly visible or mentioned, mark it as null.\n\nRespond in JSON format:\n{\n  "name": "coffee name or null",\n  "origin": "origin country/region or null",\n  "farm": "farm name or null",\n  "variety": "coffee variety or null",\n  "process": "processing method or null",\n  "weight": weight_in_grams_as_number_or_null,\n  "cost": cost_in_usd_as_number_or_null,\n  "purchase_date": "YYYY-MM-DD format or null",\n  "supplier": "supplier name or null",\n  "notes": "any additional notes or null",\n  "confidence": "high|medium|low",\n  "extracted_text": "summary of what text was visible in the image"\n}'
            }
          ]
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error response:', errorText)
      console.error('Claude API status:', claudeResponse.status, claudeResponse.statusText)
      throw new Error(`Claude API error: ${claudeResponse.status} ${claudeResponse.statusText}`)
    }

    const claudeData = await claudeResponse.json()
    const response = claudeData.content[0].text

    console.log('Raw Claude response:', response)
    
    // Parse JSON response from Claude
    let extractedData
    try {
      // Try to extract all individual JSON objects from the response
      const jsonMatches = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Parse each JSON object
        const allItems = []
        for (const jsonString of jsonMatches) {
          try {
            const item = JSON.parse(jsonString)
            allItems.push(item)
          } catch (itemError) {
            console.warn('Failed to parse individual item:', jsonString, itemError)
          }
        }
        
        if (allItems.length > 0) {
          // Return all items for bulk import
          extractedData = allItems
          console.log(`Extracted ${allItems.length} coffee purchases:`, extractedData)
        } else {
          throw new Error('No valid JSON objects found')
        }
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError)
      console.error('Raw response was:', response)
      return NextResponse.json({ 
        error: 'Failed to parse invoice data',
        raw_response: response,
        parse_error: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      extracted_data: extractedData
    })

  } catch (error) {
    console.error('Invoice processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice image' }, 
      { status: 500 }
    )
  }
}