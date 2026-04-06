import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixJoko() {
  try {
    const nik = '940866';
    const email = 'jsnugroho31@gmail.com';
    const name = 'Joko Setyo Nugroho, S.T';

    console.log(`Fixing account for Joko (${nik})...`);

    // 1. Find User by Email
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = listData.users.find(u => u.email === email);
    let userId;

    if (!user) {
      console.log('User not found in Auth, creating new...');
      const { data: newData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: nik,
        email_confirm: true,
        user_metadata: { name, nik }
      });
      if (createError) throw createError;
      userId = newData.user.id;
    } else {
      console.log(`User found (ID: ${user.id}), updating password and metadata...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: nik,
        user_metadata: { name, nik }
      });
      if (updateError) throw updateError;
      userId = user.id;
    }

    // 2. Sync Profile
    console.log('Syncing profile table...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        nik,
        role: 'teacher'
      });
    if (profileError) throw profileError;

    // 3. Update Teacher Record
    console.log('Updating teachers table...');
    const { error: teacherError } = await supabase
      .from('teachers')
      .update({ user_id: userId })
      .eq('nik', nik);
    if (teacherError) throw teacherError;

    console.log('Joko fixed successfully!');
    console.log(`NIK/Username: ${nik}`);
    console.log(`Password: ${nik}`);
  } catch (e) {
    console.error('Fix failed:', e.message);
    process.exit(1);
  }
}

fixJoko();
