import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoginQuery(username: string) {
  console.log(`Testing login query for: "${username}"`);
  
  const { data, error } = await supabase.from('users')
    .select('*')
    .or(`username.ilike.${username},email.ilike.${username}`)
    .maybeSingle(); // Using maybeSingle to avoid 406 on no match
  
  if (error) {
    console.error('Query Error:', error);
    return;
  }
  
  if (!data) {
    console.log('No user found.');
  } else {
    console.log('User found:', JSON.stringify(data, null, 2));
  }
}

async function runTests() {
  await testLoginQuery('admin1');
  await testLoginQuery('admin1@gmail.com');
  await testLoginQuery('tenant12');
}

runTests();
