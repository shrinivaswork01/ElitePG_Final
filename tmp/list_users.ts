import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, name, role, password');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Total users found:', data.length);
  console.table(data);
}

listUsers();
