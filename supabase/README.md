# Bean Ledger - Supabase Database Setup

This guide will help you set up the Supabase database for Bean Ledger.

## Prerequisites

- Supabase account
- Bean Ledger project configured with environment variables

## Setup Instructions

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New project"
3. Choose your organization
4. Enter project name: `bean-ledger`
5. Create a secure database password
6. Choose your region
7. Click "Create new project"

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings → API**
2. Copy the **Project URL** and **anon public key**
3. Update your `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Run Database Migrations

You can run the migrations in order using the Supabase SQL Editor:

#### Step 1: Initial Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `migrations/001_initial_schema.sql`
3. Click "Run" to create all tables and indexes

#### Step 2: Row Level Security
1. Copy and paste the contents of `migrations/002_row_level_security.sql`
2. Click "Run" to enable RLS and create all security policies

#### Step 3: Database Functions
1. Copy and paste the contents of `migrations/003_database_functions.sql`
2. Click "Run" to create all helper functions

#### Step 4: Triggers and Defaults
1. Copy and paste the contents of `migrations/004_triggers_and_defaults.sql`
2. Click "Run" to create triggers, defaults, and views

### 4. Enable Authentication

1. Go to **Authentication → Settings**
2. Enable **Email** authentication
3. Configure your site URL: `http://localhost:3000` (for development)
4. Add production URL when deploying

### 5. Verify Setup

After running all migrations, you should see these tables in your database:

- `ledger` - Immutable audit log
- `coffee_batches` - Coffee inventory metadata
- `equipment` - User equipment profiles
- `brew_ratings` - Detailed tasting evaluations
- `user_preferences` - User settings and defaults
- `ai_recommendations` - AI suggestion history

### 6. Test Database Functions

You can test the database functions in the SQL Editor:

```sql
-- Test getting roasted inventory (replace with actual user ID)
SELECT * FROM calculate_roasted_inventory('00000000-0000-0000-0000-000000000000');

-- Test getting green inventory
SELECT * FROM calculate_green_inventory('00000000-0000-0000-0000-000000000000');

-- Test getting brew history
SELECT * FROM get_brew_history('00000000-0000-0000-0000-000000000000', 10);
```

## Database Architecture

### Immutable Ledger Pattern

Bean Ledger uses an immutable ledger architecture where all state changes are recorded as permanent entries. The current state is calculated from the sum of all ledger entries.

**Benefits:**
- Complete audit trail of all actions
- Ability to reconstruct state at any point in time
- Data integrity and tamper resistance
- Time-series analytics capabilities

### Core Tables

#### `ledger`
The heart of the system - records all state changes as immutable entries.

#### `coffee_batches` 
Metadata about coffee types (green and roasted) for reference.

#### `equipment`
User's equipment profiles with settings schemas.

#### `brew_ratings`
Detailed tasting evaluations linked to brew log entries.

#### `user_preferences`
User-specific settings and defaults.

#### `ai_recommendations`
History of AI-generated suggestions and user feedback.

### Security

All tables use Row Level Security (RLS) to ensure users can only access their own data. The `ledger` table is append-only - no updates or deletes allowed to maintain immutability.

## Troubleshooting

### Migration Errors

If you encounter errors while running migrations:

1. **Permission errors**: Ensure you're logged in as the project owner
2. **Syntax errors**: Copy the SQL exactly as provided
3. **Dependency errors**: Run migrations in the correct order (001, 002, 003, 004)

### Authentication Issues

If authentication isn't working:

1. Check that the site URL is configured correctly
2. Verify environment variables are set
3. Ensure RLS policies are applied correctly

### Function Errors

If database functions aren't working:

1. Check that all tables were created successfully
2. Verify the functions were created with correct permissions
3. Test with valid user IDs (UUIDs)

## Production Considerations

### Performance

- Indexes are created for common query patterns
- Functions are marked as `SECURITY DEFINER` for performance
- Consider partitioning the `ledger` table for very high volume

### Backups

- Supabase automatically backs up your database
- Consider exporting critical data periodically
- The immutable ledger provides inherent data protection

### Monitoring

- Monitor function execution times
- Watch for slow queries in the ledger table
- Set up alerts for authentication failures

## Next Steps

After database setup is complete, you can:

1. Test the authentication flow
2. Create some sample data
3. Verify the immutable ledger is working
4. Test the database functions
5. Proceed to Stage 3: Authentication System

---

For more help, see the [Supabase documentation](https://supabase.com/docs) or the main Bean Ledger README.