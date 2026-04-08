import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTeacher() {
  const { data, error } = await supabase
    .from('teachers')
    .select('nik, name, email')
    .eq('nik', '8814030')
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Teacher Data:', data);
  }
}

checkTeacher();
