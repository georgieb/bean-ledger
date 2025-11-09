// Check existing users script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.log('ℹ️  No service key found in .env.local');
  console.log('   Add SUPABASE_SERVICE_ROLE_KEY to check existing users');
  console.log('   Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(0);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  try {
    console.log('👥 Checking existing users...\n');
    
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log(`Found ${users.users.length} users:\n`);
    
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Email confirmed: ${user.email_confirmed_at ? '✅' : '❌'}`);
      console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to check users:', error.message);
  }
}

checkUsers();