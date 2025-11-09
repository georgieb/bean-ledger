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
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
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
  
  if (error) {
    // Provide more helpful error messages
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('Email confirmation required. Please check your email or contact support to disable email confirmation.');
    } else if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (error.message?.includes('Too many requests')) {
      throw new Error('Too many sign-in attempts. Please wait a moment and try again.');
    }
    throw error;
  }
  
  // Verify we have both user and session
  if (!data.session || !data.user) {
    throw new Error('Sign-in successful but session could not be established. Please try again.');
  }
  
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  // Development mode: bypass email confirmation entirely
  const isDev = process.env.NODE_ENV === 'development';
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(isDev && { 
        emailRedirectTo: undefined,
        data: { email_confirmed_at: new Date().toISOString() }
      })
    }
  });
  
  if (error) {
    // If user already exists, try signing them in instead
    if (error.message?.includes('User already registered')) {
      console.log('User exists, attempting sign in...');
      return await signInWithEmail(email, password);
    }
    throw error;
  }
  
  // For development, automatically sign in if no session was created
  if (isDev && data.user && !data.session) {
    console.log('Development mode: auto-signing in after signup...');
    try {
      const signInResult = await signInWithEmail(email, password);
      return signInResult;
    } catch (signInError) {
      // If auto sign-in fails, return the original signup data
      console.log('Auto sign-in failed, user may need email confirmation');
      throw new Error('Account created successfully, but automatic sign-in failed. Please try signing in manually.');
    }
  }
  
  return data;
}