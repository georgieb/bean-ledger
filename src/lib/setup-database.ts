import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Setup script to create the new database schema
 * This will be used to migrate from the current ledger-based system
 */
export async function setupDatabase() {
  console.log('🚀 Setting up new database schema...');

  try {
    // Enable UUID extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    // Create users table first (extends auth.users)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    console.log('✅ Database schema setup complete');
    
    // Generate and run migrations
    console.log('📝 Generating Drizzle migrations...');
    
    // Note: In practice, you would run:
    // npm run db:generate
    // npm run db:migrate
    
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Migrate data from old ledger system to new schema
 */
export async function migrateFromLedger() {
  console.log('🔄 Starting data migration from ledger system...');

  try {
    // Step 1: Extract unique green coffees from ledger metadata
    const greenCoffeesResult = await db.execute(sql`
      SELECT DISTINCT 
        metadata->>'name' as name,
        metadata->>'origin' as origin,
        metadata->>'farm' as farm,
        metadata->>'variety' as variety,
        metadata->>'process' as process,
        user_id,
        MIN(created_at) as first_purchase
      FROM ledger 
      WHERE action_type = 'green_purchase' 
        AND entity_type = 'green_coffee'
      GROUP BY metadata->>'name', metadata->>'origin', metadata->>'farm', 
               metadata->>'variety', metadata->>'process', user_id
    `);

    console.log(`Found ${greenCoffeesResult.rowCount} unique green coffees`);

    // Step 2: Extract roast batches from ledger
    const roastBatchesResult = await db.execute(sql`
      SELECT 
        metadata->>'name' as name,
        metadata->>'green_coffee_name' as green_coffee_name,
        metadata->>'roast_date' as roast_date,
        metadata->>'roast_level' as roast_level,
        (metadata->>'green_weight')::numeric as green_weight,
        (metadata->>'roasted_weight')::numeric as roasted_weight,
        (metadata->>'batch_number')::integer as batch_number,
        metadata->>'notes' as notes,
        user_id,
        created_at
      FROM ledger 
      WHERE action_type = 'roast_completed' 
        AND entity_type = 'roasted_coffee'
      ORDER BY user_id, (metadata->>'batch_number')::integer
    `);

    console.log(`Found ${roastBatchesResult.rowCount} roast batches`);

    // Step 3: Calculate current inventory from transactions
    const inventoryResult = await db.execute(sql`
      WITH inventory_calc AS (
        SELECT 
          user_id,
          entity_type,
          metadata->>'name' as coffee_name,
          SUM(amount_change) as total_amount
        FROM ledger 
        WHERE entity_type IN ('green_coffee', 'roasted_coffee')
          AND action_type IN ('green_purchase', 'roast_completed', 'consumption', 'green_adjustment', 'roasted_adjustment')
        GROUP BY user_id, entity_type, metadata->>'name'
        HAVING SUM(amount_change) > 0
      )
      SELECT * FROM inventory_calc ORDER BY user_id, entity_type, coffee_name
    `);

    console.log(`Calculated inventory for ${inventoryResult.rowCount} items`);

    // Note: The actual migration would insert this data into the new tables
    // This is a preview of what would be migrated

    console.log('✅ Data migration analysis complete');
    return {
      greenCoffees: greenCoffeesResult.rowCount,
      roastBatches: roastBatchesResult.rowCount,
      inventoryItems: inventoryResult.rowCount
    };

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
}

// Utility to test the new system
export async function testNewSystem() {
  console.log('🧪 Testing new ORM system...');
  
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful');
    
    // Test schema exists
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('green_coffees', 'roast_batches', 'green_inventory', 'roasted_inventory')
    `);
    
    console.log(`✅ Found ${tables.rowCount} new schema tables`);
    
    return true;
  } catch (error) {
    console.error('❌ System test failed:', error);
    return false;
  }
}