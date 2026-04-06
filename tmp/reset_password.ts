import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'jsnugroho31@gmail.com';
  const newPassword = 'password123';

  console.log(`Resetting password for ${email}...`);

  const { data, error } = await supabase.auth.admin.updateUserByEmail(email, {
    password: newPassword
  });

  if (error) {
    console.error('Error resetting password:', error.message);
    process.exit(1);
  }

  console.log('Password reset successfully!');
  console.log(`New password for ${email} is: ${newPassword}`);
}

resetPassword();
