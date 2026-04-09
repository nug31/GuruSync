import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSpecifics() {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id, name, nik, email, user_id')
    .or('nik.eq.940866,nik.eq.851766');

  if (error) {
    console.error(error);
  } else {
    console.log('--- Targeted Teachers ---');
    teachers.forEach(t => {
      console.log(`Name: ${t.name}, NIK: ${t.nik}, Email: ${t.email}, UserID: ${t.user_id}`);
    });
  }

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, name, nik, email');
  
  if (pErr) console.error(pErr);
  else {
    console.log('\n--- Profiles matching these NIKs ---');
    profiles.filter(p => p.nik === '940866' || p.nik === '851766').forEach(p => {
      console.log(`Name: ${p.name}, NIK: ${p.nik}, Email: ${p.email}, ProfileID: ${p.id}`);
    });
  }
}

checkSpecifics();
