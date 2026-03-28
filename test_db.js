import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://opztcswszobvknfwpoij.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wenRjc3dzem9idmtuZndwb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxMTE4MjIsImV4cCI6MjAyMjcxMTgyMn0.sb_publishable_bZ9-aTPQ6ZfErWaH-Jhllw_mN0LRQeR' // Put actual key here
);

async function test() {
  const { data: branches, error: bErr } = await supabase.from('pg_branches').select('id').limit(1);
  console.log('Branches:', branches, bErr);

  const newId = `u${Date.now()}`;
  const { error: tErr } = await supabase.from('tenants').insert({
    user_id: newId,
    name: 'Test Tenant',
    email: 'test@example.com',
    phone: null,
    room_id: null,
    bed_number: null,
    joining_date: new Date().toISOString().split('T')[0],
    rent_amount: 0,
    deposit_amount: 0,
    payment_due_date: 1,
    status: 'active',
    kyc_status: 'unsubmitted',
    branch_id: branches?.[0]?.id || null,
    late_fee_per_day: 0,
    rent_agreement_url: null
  });
  console.log('Tenant Insert Error:', tErr);
}

test();
