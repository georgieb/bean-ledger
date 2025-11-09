const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase session persistence...\n');

async function testPersistence() {
  // Create client with explicit localStorage simulation
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
  
  const email = 'gbborrero@gmail.com';
  const password = process.argv[2];
  
  if (!password) {
    console.log('Usage: node simple-auth-test.js <your-password>');
    return;
  }
  
  try {
    console.log('1️⃣ Signing in...');
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('❌ Sign in failed:', error.message);
      return;
    }
    
    console.log('✅ Sign in successful');
    console.log('👤 User:', data.user.email);
    console.log('🎫 Session expires:', new Date(data.session.expires_at * 1000));
    
    console.log('\n2️⃣ Immediately checking session...');
    const { data: { session: immediateSession } } = await client.auth.getSession();
    
    if (immediateSession) {
      console.log('✅ Immediate session check: SUCCESS');
      console.log('👤 User:', immediateSession.user.email);
    } else {
      console.log('❌ Immediate session check: FAILED');
    }
    
    console.log('\n3️⃣ Waiting 2 seconds then checking again...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: { session: delayedSession } } = await client.auth.getSession();
    
    if (delayedSession) {
      console.log('✅ Delayed session check: SUCCESS');
      console.log('👤 User:', delayedSession.user.email);
    } else {
      console.log('❌ Delayed session check: FAILED');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testPersistence();