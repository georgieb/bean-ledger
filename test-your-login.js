// Test your specific login credentials
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Testing Your Login Credentials\n');

// Get email from command line argument
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node test-your-login.js your-email@example.com your-password');
  process.exit(1);
}

async function testLogin() {
  try {
    console.log('📧 Testing email:', email);
    console.log('🔐 Password length:', password.length);
    console.log('');
    
    console.log('1️⃣ Attempting sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('❌ Sign in failed:', error.message);
      console.log('');
      
      // Check if it's an email confirmation issue
      if (error.message.includes('Email not confirmed')) {
        console.log('🔍 This is an email confirmation issue!');
        console.log('   Even though you disabled email confirmations,');
        console.log('   existing users may still need confirmation.');
        console.log('');
        console.log('💡 Solutions:');
        console.log('   1. Wait a few minutes for Supabase settings to propagate');
        console.log('   2. Try signing up with the same email again');
        console.log('   3. Check if there are multiple users with this email');
      }
      
      return;
    }
    
    console.log('✅ Sign in successful!');
    console.log('👤 User ID:', data.user?.id);
    console.log('📧 Email:', data.user?.email);
    console.log('✉️  Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('🎫 Session expires:', data.session?.expires_at);
    console.log('');
    console.log('🎉 Your credentials work! The issue might be in the frontend.');
    
    // Test a quick database query
    console.log('2️⃣ Testing database access...');
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
      
    if (prefError) {
      console.log('⚠️  Database query failed:', prefError.message);
      console.log('   This might be a permissions issue');
    } else {
      console.log('✅ Database access works');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testLogin().then(() => {
  console.log('\n🏁 Test completed');
});