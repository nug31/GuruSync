import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findMismatches() {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id, name, nik, email, user_id');

  if (error) {
    console.error(error);
    return;
  }

  const userIdCounts = {};
  teachers.forEach(t => {
    if (t.user_id) {
      if (!userIdCounts[t.user_id]) userIdCounts[t.user_id] = [];
      userIdCounts[t.user_id].push(t);
    }
  });

  console.log('--- Duplicate UserID Mappings ---');
  Object.keys(userIdCounts).forEach(uid => {
    if (userIdCounts[uid].length > 1) {
      console.log(`UserID: ${uid}`);
      userIdCounts[uid].forEach(t => {
        console.log(`  - ${t.name} (NIK: ${t.nik}, Email: ${t.email})`);
      });
    }
  });

  console.log('\n--- Specific Check ---');
  const joko = teachers.find(t => t.nik === '940866');
  const abdillah = teachers.find(t => t.nik === '851766');
  
  if (joko) console.log('Joko:', JSON.stringify(joko));
  if (abdillah) console.log('Abdillah:', JSON.stringify(abdillah));
}

findMismatches();
