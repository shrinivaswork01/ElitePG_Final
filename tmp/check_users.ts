import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  const usernames = ['admin1', 'tenant12'];
  
  console.log('Checking users:', usernames);
  
  for (const username of usernames) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.${username},email.ilike.${username}`);
    
    if (error) {
      console.error(`Error fetching user ${username}:`, error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`User ${username} NOT FOUND.`);
    } else {
      console.log(`User ${username} FOUND:`, JSON.stringify(data, null, 2));
    }
  }
}

checkUsers();
