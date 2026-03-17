import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('username', { ascending: true });
  
  if (error) {
    fs.writeFileSync('tmp/all_users.txt', 'Error: ' + JSON.stringify(error, null, 2));
    return;
  }
  
  const content = data.map(u => `[${u.role}] ${u.username} | ${u.email} | ${u.name} | Pass: ${u.password}`).join('\n');
  fs.writeFileSync('tmp/all_users.txt', content);
  console.log('Dumped', data.length, 'users to tmp/all_users.txt');
}

dumpUsers();
