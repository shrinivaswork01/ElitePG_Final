import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opztcswszobvknfwpoij.supabase.co';
const supabaseAnonKey = 'sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTenant12() {
  console.log('Fetching tenant12 details...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('email', 'tenant12@gmail.com')
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error('Tenant12 not found or error:', tenantError);
    return;
  }

  console.log('Tenant found:', tenant.id, 'Branch:', tenant.branch_id);

  if (tenant.user_id) {
    console.log('Tenant already has a user_id:', tenant.user_id);
    // Check if user exists
    const { data: user } = await supabase.from('users').select('*').eq('id', tenant.user_id).maybeSingle();
    if (user) {
      console.log('User already exists:', user.username);
      return;
    }
    console.log('User ID exists in tenant table but user record is missing. Proceeding to create user.');
  }

  const newUserId = `u${Date.now()}`;
  const newUser = {
    id: newUserId,
    username: 'tenant12',
    name: 'tenant12',
    email: 'tenant12@gmail.com',
    role: 'tenant',
    password: '123456',
    is_authorized: true,
    branch_id: tenant.branch_id,
    provider: 'local'
  };

  console.log('Creating user:', newUser.username);
  const { error: userError } = await supabase.from('users').insert(newUser);

  if (userError) {
    console.error('Error creating user:', userError);
    return;
  }

  console.log('Updating tenant record with user_id...');
  const { error: updateError } = await supabase
    .from('tenants')
    .update({ user_id: newUserId })
    .eq('id', tenant.id);

  if (updateError) {
    console.error('Error updating tenant:', updateError);
  } else {
    console.log('Successfully fixed tenant12! They can now login with tenant12 / 123456');
  }
}

fixTenant12();
