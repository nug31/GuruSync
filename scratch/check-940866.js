import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const nik = '940866';
  console.log(`Checking for NIK: ${nik}`);
  
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('nik', nik);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Teachers found:', teachers);
  }

  // Also check if it matches birth_date
  const { data: byBirth, error: err2 } = await supabase
    .from('teachers')
    .select('*');
  
  if (byBirth) {
      const match = byBirth.find(t => {
          if (!t.birth_date) return false;
          const d = new Date(t.birth_date);
          const formatted = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
          return formatted === nik;
      });
      console.log('Match by birth date logic:', match ? match.name : 'None');
  }
}

check();
