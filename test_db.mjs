import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const newId = `u${Date.now()}`;
  const { error: tErr, data: tData } = await supabase.from('tenants').insert({
    user_id: newId,
    name: 'Test Tenant',
    email: 'test@example.com',
    phone: '1234567890',
    bed_number: 0,
    room_id: null,
    joining_date: new Date().toISOString().split('T')[0],
    rent_amount: 0,
    deposit_amount: 0,
    payment_due_date: 1,
    status: 'active',
    kyc_status: 'unsubmitted',
    rent_agreement_url: null
  }).select();
  fs.writeFileSync('error_out.json', JSON.stringify({tData, tErr}, null, 2));
}

test();
