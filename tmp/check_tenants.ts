import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTenants() {
  console.log('Searching for tenant with name similar to "tenant12"...');
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, email, user_id')
    .or('name.ilike.%tenant12%,email.ilike.%tenant12%');
  
  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No tenant found matching "tenant12".');
    // Just list some tenants to see the pattern
    const { data: allTenants } = await supabase.from('tenants').select('name, email').limit(5);
    console.log('Some existing tenants:', allTenants);
  } else {
    console.log('Tenant matched:', JSON.stringify(data, null, 2));
  }
}

checkTenants();
