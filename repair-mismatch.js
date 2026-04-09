import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function repair() {
  console.log('🔍 Starting repair for Joko and Abdillah...');

  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error listing users:', usersErr);
    return;
  }

  const jokoAuth = users.find(u => u.email === '940866@gurusync.net');
  const abdAuth = users.find(u => u.email === '851766@gurusync.net');

  if (jokoAuth) {
    console.log(`✅ Found Joko Auth User: ${jokoAuth.id}`);
    const { error: tErr } = await supabase.from('teachers').update({ user_id: jokoAuth.id }).eq('nik', '940866');
    if (tErr) console.error('Error updating Joko teacher record:', tErr);
    
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: jokoAuth.id,
      email: jokoAuth.email,
      name: 'Joko Setyo Nugroho, S',
      nik: '940866',
      role: 'teacher'
    });
    if (pErr) console.error('Error updating Joko profile record:', pErr);
  } else {
    console.warn('⚠️ Joko Auth User not found!');
  }

  if (abdAuth) {
    console.log(`✅ Found Abdillah Auth User: ${abdAuth.id}`);
    const { error: tErr } = await supabase.from('teachers').update({ user_id: abdAuth.id }).eq('nik', '851766');
    if (tErr) console.error('Error updating Abdillah teacher record:', tErr);
    
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: abdAuth.id,
      email: abdAuth.email,
      name: 'Abdillah Putra, A Md',
      nik: '851766',
      role: 'teacher'
    });
    if (pErr) console.error('Error updating Abdillah profile record:', pErr);
  } else {
    console.warn('⚠️ Abdillah Auth User not found!');
  }

  // Final check: find any OTHER teachers sharing these user_ids
  if (jokoAuth || abdAuth) {
    const ids = [jokoAuth?.id, abdAuth?.id].filter(Boolean);
    const { data: others } = await supabase.from('teachers').select('name, nik, user_id').in('user_id', ids);
    console.log('\nCurrent mappings for these Auth IDs in teachers table:');
    console.table(others);
  }

  console.log('🚀 Repair attempt finished.');
}

repair();
