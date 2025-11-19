import { supabase } from './supabase'

// Function to clean up failed adjustment entries
export async function cleanupFailedAdjustments(coffeeName: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    console.log(`🧹 Cleaning up failed adjustments for: ${coffeeName}`)

    // Find all negative amount entries for this coffee (these are ignored by database)
    const { data: negativeEntries, error: findError } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_type', 'green_coffee')
      .ilike('metadata->>name', coffeeName)
      .lt('amount_change', 0) // Only negative amounts

    if (findError) {
      console.error('❌ Error finding negative entries:', findError)
      return
    }

    if (!negativeEntries || negativeEntries.length === 0) {
      console.log('✅ No negative entries to clean up')
      return
    }

    console.log(`📋 Found ${negativeEntries.length} negative entries to clean up`)

    // Add a cleanup note entry
    const cleanupEntityId = crypto.randomUUID()
    await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'green_purchase',
        entity_type: 'green_coffee',
        entity_id: cleanupEntityId,
        amount_change: 0,
        metadata: {
          name: `${coffeeName} (CLEANUP NOTICE)`,
          origin: 'System Cleanup',
          weight: 0,
          purchase_date: new Date().toISOString().split('T')[0],
          supplier: 'System',
          notes: `Cleanup notice: ${negativeEntries.length} failed adjustment entries exist but are ignored by database. Use replacement coffee method for adjustments.`,
          cleanup_notice: true,
          failed_entries_count: negativeEntries.length
        },
        balance_after: null
      }] as any)

    console.log(`✅ Added cleanup notice. ${negativeEntries.length} failed entries documented.`)
    console.log('💡 Use the "replacement coffee" method for future adjustments')
    
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Make available in browser console
(window as any).cleanupFailedAdjustments = cleanupFailedAdjustments