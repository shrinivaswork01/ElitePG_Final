/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Please check your .env file.');
}

if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('⚠️ WARNING: VITE_SUPABASE_ANON_KEY does not appear to be a valid Supabase JWT. It should start with "eyJ". Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
