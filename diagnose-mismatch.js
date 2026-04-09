import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnose() {
  console.log('--- Checking Teachers ---');
  // Check specifically for Joko and Abdillah
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id, name, nik, email, user_id')
    .or('nik.eq.940866,nik.eq.851766,name.ilike.%joko%,name.ilike.%abdillah%');

  if (error) {
    console.error('Error fetching teachers:', error);
  } else {
    console.table(teachers);
  }

  console.log('\n--- Checking Duplicates ---');
  // Check for duplicate user_ids in teachers table
  const { data: allTeachers, error: allErr } = await supabase
    .from('teachers')
    .select('user_id, name, nik');
  
  if (allErr) {
    console.error('Error fetching all teachers:', allErr);
  } else {
    const userIdMap = {};
    const duplicates = [];
    allTeachers.forEach(t => {
      if (t.user_id) {
        if (!userIdMap[t.user_id]) userIdMap[t.user_id] = [];
        userIdMap[t.user_id].push(t);
      }
    });

    Object.keys(userIdMap).forEach(uid => {
      if (userIdMap[uid].length > 1) {
        duplicates.push({ userId: uid, teachers: userIdMap[uid] });
      }
    });

    if (duplicates.length > 0) {
      console.log('Found Duplicates Mapping to same user_id:');
      duplicates.forEach(d => {
        console.log(`User ID: ${d.userId}`);
        d.teachers.forEach(t => console.log(`  - ${t.name} (NIK: ${t.nik})`));
      });
    } else {
      console.log('No duplicate user_id mappings found.');
    }
  }

  console.log('\n--- Checking Fallback Emails ---');
  const fallbackEmailCount = allTeachers.filter(t => t.email?.includes('@gurusync.net')).length;
  console.log(`Total teachers with @gurusync.net email: ${fallbackEmailCount}`);
  
  const uniqueEmails = new Set(allTeachers.map(t => t.email).filter(Boolean));
  console.log(`Unique emails in teachers table: ${uniqueEmails.size}`);
  console.log(`Total teachers in table: ${allTeachers.length}`);
}

diagnose();
