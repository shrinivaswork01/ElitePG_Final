import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qveauacuhpvrjkepsqpo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZWF1YWN1aHB2cmprZXBzcXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NzEwNDUsImV4cCI6MjA1ODU0NzA0NX0.sb_publishable_nTj_E_lKoTjFmRmksYTlmA_8Fg36woU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUsers() {
  console.log('--- Supabase User Check ---')
  const { data, error } = await supabase.from('users').select('id, username, email, role')
  if (error) {
    console.error('Error fetching users:', error)
  } else {
    console.log('Total users found:', data?.length || 0)
    if (data && data.length > 0) {
      data.forEach(u => console.log(`- [${u.role}] ${u.username} (${u.email}) ID: ${u.id}`))
    } else {
      console.log('NO USERS FOUND in the "users" table. This is why login is failing.')
    }
  }

  console.log('\n--- PG Branches Check ---')
  const { data: branches, error: bError } = await supabase.from('pg_branches').select('id, name')
  if (bError) console.error('Error fetching branches:', bError)
  else console.log('Branches:', branches)
}

checkUsers()
