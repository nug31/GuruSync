import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxqqtqbtpuinydacwpnj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF0cWJ0cHVpbnlkYWN3cG5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkxMzU0NiwiZXhwIjoyMDkwNDg5NTQ2fQ.ZLRcS5_snE0eSXaoh2rGCHY7bcM9UF3CKsHMDBue-So';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function repairDates() {
  console.log('🛠️ Memulai perbaikan tanggal (Shift +1 hari)...');

  // 1. Get all teachers
  const { data: teachers, error: fetchErr } = await supabase
    .from('teachers')
    .select('id, name, nik, birth_date, join_date');

  if (fetchErr) {
    console.error('Gagal mengambil data guru:', fetchErr);
    return;
  }

  console.log(`📊 Memproses ${teachers.length} guru...`);

  for (const teacher of teachers) {
    const updates = {};
    
    if (teacher.birth_date) {
      const d = new Date(teacher.birth_date);
      d.setDate(d.getDate() + 1);
      updates.birth_date = d.toISOString().split('T')[0];
    }

    if (teacher.join_date) {
      const d = new Date(teacher.join_date);
      d.setDate(d.getDate() + 1);
      updates.join_date = d.toISOString().split('T')[0];
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('teachers')
        .update(updates)
        .eq('id', teacher.id);
      
      if (updErr) {
        console.error(`❌ Gagal memperbaiki ${teacher.name}:`, updErr.message);
      } else {
        console.log(`✅ Diperbaiki: ${teacher.name}`);
      }
    }
  }

  console.log('\n✨ Perbaikan data selesai!');
}

repairDates();
