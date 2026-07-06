import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { scheduledRoasts } from '@/lib/schema'
import { eq, and, gte, lte, lt } from 'drizzle-orm'

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

// GET /api/schedule - Get all scheduled roasts
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    const url = new URL(req.url)
    const filter = url.searchParams.get('filter')

    let whereClause = eq(scheduledRoasts.userId, user.id)

    if (filter === 'upcoming') {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      whereClause = and(
        eq(scheduledRoasts.userId, user.id),
        eq(scheduledRoasts.completed, false),
        gte(scheduledRoasts.scheduledDate, today),
        lte(scheduledRoasts.scheduledDate, nextWeek)
      )!
    } else if (filter === 'overdue') {
      const today = new Date().toISOString().split('T')[0]
      
      whereClause = and(
        eq(scheduledRoasts.userId, user.id),
        eq(scheduledRoasts.completed, false),
        lt(scheduledRoasts.scheduledDate, today)
      )!
    }

    const result = await db.select()
      .from(scheduledRoasts)
      .where(whereClause)
      .orderBy(scheduledRoasts.scheduledDate)
    return NextResponse.json(result.map(mapDbRowToScheduledRoast))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
}

// POST /api/schedule - Create new scheduled roast
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    const body = await req.json()

    const result = await db.insert(scheduledRoasts).values({
      userId: user.id,
      coffeeName: body.coffee_name,
      greenCoffeeName: body.green_coffee_name,
      scheduledDate: body.scheduled_date,
      greenWeight: body.green_weight.toString(),
      targetRoastLevel: body.target_roast_level,
      equipmentId: body.equipment_id || null,
      notes: body.notes || null,
      priority: body.priority || 'medium'
    }).returning()

    return NextResponse.json(mapDbRowToScheduledRoast(result[0]))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}