// Quick session check
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSession() {
  console.log('🔍 Checking current session...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    if (!session) {
      console.log('❌ No session found');
      console.log('   This means you need to sign in again');
      return;
    }
    
    console.log('✅ Session found!');
    console.log('👤 User:', session.user.email);
    console.log('🎫 Expires:', session.expires_at);
    console.log('🔑 Access token:', session.access_token.substring(0, 20) + '...');
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if (now >= expiresAt) {
      console.log('⚠️  Session is expired!');
    } else {
      console.log('✅ Session is valid');
      console.log(`   Expires in ${Math.floor((expiresAt - now) / 60)} minutes`);
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkSession();