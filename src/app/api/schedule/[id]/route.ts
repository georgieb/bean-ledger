import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { scheduledRoasts } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) throw new Error('No authorization header')

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) throw new Error('User not authenticated')
  
  return user
}

// Helper function to convert DB row to API format
function mapDbRowToScheduledRoast(row: any) {
  return {
    id: row.id,
    coffee_name: row.coffeeName,
    green_coffee_name: row.greenCoffeeName,
    scheduled_date: row.scheduledDate,
    green_weight: parseFloat(row.greenWeight),
    target_roast_level: row.targetRoastLevel,
    equipment_id: row.equipmentId,
    notes: row.notes,
    priority: row.priority,
    completed: row.completed,
    completed_date: row.completedDate?.toISOString(),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString()
  }
}

// PUT /api/schedule/[id] - Update scheduled roast
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    const body = await req.json()
    const { id } = params

    const updateData: any = {}
    if (body.coffee_name) updateData.coffeeName = body.coffee_name
    if (body.green_coffee_name) updateData.greenCoffeeName = body.green_coffee_name
    if (body.scheduled_date) updateData.scheduledDate = body.scheduled_date
    if (body.green_weight) updateData.greenWeight = body.green_weight.toString()
    if (body.target_roast_level) updateData.targetRoastLevel = body.target_roast_level
    if (body.equipment_id !== undefined) updateData.equipmentId = body.equipment_id
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.priority) updateData.priority = body.priority

    const result = await db.update(scheduledRoasts)
      .set(updateData)
      .where(and(eq(scheduledRoasts.id, id), eq(scheduledRoasts.userId, user.id)))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Scheduled roast not found' }, { status: 404 })
    }

    return NextResponse.json(mapDbRowToScheduledRoast(result[0]))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// DELETE /api/schedule/[id] - Delete scheduled roast
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    const { id } = params

    const result = await db.delete(scheduledRoasts)
      .where(and(eq(scheduledRoasts.id, id), eq(scheduledRoasts.userId, user.id)))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Scheduled roast not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// PATCH /api/schedule/[id] - Mark as completed
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    const { id } = params

    const result = await db.update(scheduledRoasts)
      .set({
        completed: true,
        completedDate: new Date()
      })
      .where(and(eq(scheduledRoasts.id, id), eq(scheduledRoasts.userId, user.id)))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Scheduled roast not found' }, { status: 404 })
    }

    return NextResponse.json(mapDbRowToScheduledRoast(result[0]))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}