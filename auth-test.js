// Authentication Test Script for Bean Ledger
// Run this script to test and debug authentication issues

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Bean Ledger Authentication Test\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Has Anon Key:', !!supabaseAnonKey);
console.log('🔐 Has Service Key:', !!supabaseServiceKey);
console.log('');

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function testAuth() {
  try {
    console.log('1️⃣ Testing current session...');
    const { data: session } = await supabase.auth.getSession();
    console.log('   Current session:', session.session ? '✅ Active' : '❌ None');
    
    console.log('\n2️⃣ Testing authentication settings...');
    
    // Try to get auth settings (requires admin)
    if (supabaseAdmin) {
      const { data: config } = await supabaseAdmin.auth.admin.getConfig();
      console.log('   Email confirmations enabled:', config.ENABLE_EMAIL_CONFIRMATIONS);
      console.log('   Signup enabled:', config.ENABLE_SIGNUP);
    } else {
      console.log('   ⚠️  No service key - cannot check auth settings');
    }
    
    console.log('\n3️⃣ Testing sign up with test user...');
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    // Try sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('   📧 User already exists - trying sign in...');
        
        // Try sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        
        if (signInError) {
          console.log('   ❌ Sign in failed:', signInError.message);
          
          // If it's email confirmation, try to fix it with admin
          if (signInError.message.includes('Email not confirmed') && supabaseAdmin) {
            console.log('   🔧 Attempting to confirm email with admin...');
            
            const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              signUpData?.user?.id || 'unknown',
              { email_confirm: true }
            );
            
            if (updateError) {
              console.log('   ❌ Admin update failed:', updateError.message);
            } else {
              console.log('   ✅ Email confirmed via admin - try signing in again');
            }
          }
        } else {
          console.log('   ✅ Sign in successful!');
          console.log('   👤 User:', signInData.user?.email);
          console.log('   🎫 Session:', !!signInData.session);
        }
      } else {
        console.log('   ❌ Sign up failed:', signUpError.message);
      }
    } else {
      console.log('   ✅ Sign up successful!');
      console.log('   👤 User:', signUpData.user?.email);
      console.log('   🎫 Session:', !!signUpData.session);
      console.log('   ✉️  Email confirmed:', !!signUpData.user?.email_confirmed_at);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuth().then(() => {
  console.log('\n🏁 Test completed');
  console.log('\n💡 Solutions if authentication fails:');
  console.log('   1. Go to Supabase Dashboard → Authentication → Settings');
  console.log('   2. Disable "Enable email confirmations"');
  console.log('   3. Or run: SUPABASE_SERVICE_ROLE_KEY=your_key node auth-test.js');
  process.exit(0);
});