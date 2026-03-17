import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyLogin(username: string, password: string) {
  const trimmedUsername = username.trim();
  console.log(`Verifying login for: "${trimmedUsername}" / "${password}"`);

  const { data, error } = await supabase.from('users')
    .select('*')
    .or(`username.ilike.${trimmedUsername},email.ilike.${trimmedUsername}`)
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data) {
    console.log('FAIL: User not found.');
    return;
  }

  if (data.password === password) {
    console.log('SUCCESS: Login works!');
  } else {
    console.log('FAIL: Password mismatch. Expected:', data.password);
  }
}

async function runVerification() {
  await verifyLogin('admin1  ', '123456'); // Testing with spaces
  await verifyLogin('tenant12', '123456');
}

runVerification();
