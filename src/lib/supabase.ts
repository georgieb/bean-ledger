import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure you have:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key'
  );
}

if (supabaseUrl.includes('your_supabase') || supabaseAnonKey.includes('your_supabase')) {
  throw new Error(
    'Please update your .env.local file with actual Supabase values, not placeholder text.\n' +
    'Get your credentials from: https://app.supabase.com/project/your-project/settings/api'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth utilities
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  // First try to sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // Disable email confirmation in development
    }
  });
  
  if (error) throw error;
  
  // If user is created but not confirmed, try to sign in anyway
  // This works if email confirmation is disabled on the server
  if (data.user && !data.session) {
    console.log('User created but not confirmed, attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      // If sign in fails, the email confirmation is probably required
      throw new Error('Account created but email confirmation is required. Please check your email.');
    }
    
    return signInData;
  }
  
  return data;
}