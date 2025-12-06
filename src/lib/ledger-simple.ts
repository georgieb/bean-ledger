import { supabase } from './supabase'

// Simple replacement function for green coffee adjustments
export async function createGreenAdjustmentEntrySimple(entry: any): Promise<any | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }
    
    const amountDiff = entry.new_amount - entry.old_amount
    console.log('🔧 Creating SIMPLE green adjustment entry:', {
      coffee_name: entry.coffee_name,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      amountDiff
    })
    
    // Use crypto.randomUUID for entity ID like the original
    const entityId = crypto.randomUUID()
    
    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'green_adjustment',
        entity_type: 'green_coffee',
        entity_id: entityId,
        amount_change: amountDiff, // This is the key - use the actual difference
        metadata: {
          name: entry.coffee_name,
          adjustment_type: amountDiff > 0 ? 'increase' : 'decrease',
          old_amount: entry.old_amount,
          new_amount: entry.new_amount,
          reason: entry.reason,
          notes: entry.notes || `Inventory adjustment: ${amountDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(amountDiff)}g`
        },
        balance_after: null
      }] as any)
      .select()
      .single()
      
    if (error) throw error
    console.log('✅ Simple green adjustment entry created:', data)
    return data
  } catch (error) {
    console.error('Error creating simple green adjustment entry:', error)
    return null
  }
}