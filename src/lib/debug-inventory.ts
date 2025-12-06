import { supabase } from './supabase'

// Debug function to understand how green coffee inventory is calculated
export async function debugGreenInventory(coffeeName: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    console.log(`🔍 Debugging green inventory for: ${coffeeName}`)

    // Get all ledger entries for this coffee
    const { data: allEntries, error: entriesError } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_type', 'green_coffee')
      .ilike('metadata->>name', coffeeName)
      .order('created_at', { ascending: true })

    if (entriesError) {
      console.error('❌ Error fetching entries:', entriesError)
      return
    }

    console.log(`📋 Found ${allEntries?.length || 0} green coffee entries:`)
    allEntries?.forEach((entry, index) => {
      console.log(`${index + 1}. Action: ${entry.action_type}, Amount: ${entry.amount_change}, Date: ${entry.created_at}`)
      console.log(`   Metadata:`, entry.metadata)
    })

    // Get current inventory from database function
    const { data: greenInventory, error: invError } = await supabase.rpc(
      'calculate_green_inventory', 
      { p_user_id: user.id }
    )

    if (invError) {
      console.error('❌ Error calculating inventory:', invError)
      return
    }

    console.log(`📊 Database inventory result:`, greenInventory)
    
    // Debug: show all coffee names from database
    console.log(`🔍 All coffee names from database:`)
    greenInventory?.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. "${item.name}" (${item.current_amount}g)`)
    })
    
    console.log(`🎯 Looking for: "${coffeeName}"`)
    
    const thisCoffee = greenInventory?.find((item: any) => 
      item.name.toLowerCase() === coffeeName.toLowerCase()
    )

    if (thisCoffee) {
      console.log(`✅ Current inventory for ${coffeeName}: ${thisCoffee.current_amount}g`)
    } else {
      console.log(`❌ ${coffeeName} not found in calculated inventory`)
    }

    // Manual calculation
    let manualTotal = 0
    allEntries?.forEach(entry => {
      if (entry.action_type === 'green_purchase') {
        manualTotal += entry.amount_change || 0
        console.log(`➕ Adding ${entry.amount_change}g from ${entry.action_type} (total: ${manualTotal}g)`)
      }
    })

    console.log(`🧮 Manual calculation total: ${manualTotal}g`)
    console.log(`🔄 Database calculation: ${thisCoffee?.current_amount || 0}g`)
    console.log(`❓ Difference: ${(thisCoffee?.current_amount || 0) - manualTotal}g`)

  } catch (error) {
    console.error('Debug error:', error)
  }
}

// Test function to call from console
(window as any).debugGreenInventory = debugGreenInventory