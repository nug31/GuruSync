import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncAccounts() {
  try {
    console.log('🔄 Memulai sinkronisasi akun guru...');

    // 1. Get all teachers
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('*');

    if (teachersError) throw teachersError;

    // 2. Get all existing auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    console.log(`📊 Ditemukan ${teachers.length} data guru di database.`);
    
    let createdCount = 0;
    let updatedCount = 0;

    for (const teacher of teachers) {
      const existingUser = authUsers.find(u => u.email === teacher.email);
      let userId;

      if (!existingUser) {
        console.log(`➕ Membuat akun baru untuk: ${teacher.name} (${teacher.email})`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: teacher.email,
          password: teacher.nik, // default password is NIK
          email_confirm: true,
          user_metadata: { name: teacher.name, nik: teacher.nik }
        });

        if (createError) {
          console.error(`❌ Gagal membuat akun ${teacher.email}:`, createError.message);
          continue;
        }
        userId = newUser.user.id;
        createdCount++;
      } else {
        userId = existingUser.id;
        // Optionally update password to NIK if requested, or just sync metadata
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { name: teacher.name, nik: teacher.nik }
        });
        updatedCount++;
      }

      // 3. Ensure profile and link user_id in teachers table
      await supabase.from('profiles').upsert({
        id: userId,
        email: teacher.email,
        name: teacher.name,
        nik: teacher.nik,
        role: 'teacher'
      });

      await supabase.from('teachers').update({ user_id: userId }).eq('id', teacher.id);
    }

    console.log('\n✅ Sinkronisasi selesai!');
    console.log(`✨ Akun Baru: ${createdCount}`);
    console.log(`🔄 Akun Diperbarui: ${updatedCount}`);
    console.log('\nPara guru sekarang bisa login dengan:');
    console.log('Username: NIK');
    console.log('Password: NIK');

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat sinkronisasi:', error.message);
    process.exit(1);
  }
}

syncAccounts();
