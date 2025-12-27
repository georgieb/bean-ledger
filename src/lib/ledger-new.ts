// Simplified green coffee adjustment function
import { supabase } from './supabase'
export async function createGreenAdjustmentEntrySimple(entry: any): Promise<any> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }
    
    const amountDiff = entry.new_amount - entry.old_amount
    console.log('🔧 Creating simplified green adjustment entry:', {
      coffee_name: entry.coffee_name,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      amountDiff
    })
    
    // Use consistent entity ID - same as the coffee being adjusted
    const entityId = `green_coffee_${user.id}_${entry.coffee_name.replace(/\s+/g, '_').toLowerCase()}`
    
    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'green_adjustment',
        entity_type: 'green_coffee',
        entity_id: entityId,
        amount_change: amountDiff, // Positive or negative
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
    console.log('✅ Green adjustment entry created:', data)
    return data
  } catch (error) {
    console.error('Error creating green adjustment entry:', error)
    return null
  }
}