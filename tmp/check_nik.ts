import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNik() {
  const nik = '940866';
  
  console.log(`Checking NIK: ${nik}`);
  
  // Try with direct match
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('*')
    .eq('nik', nik)
    .maybeSingle();
    
  if (teacherError) {
    console.error('Teacher lookup error:', teacherError);
  } else {
    console.log('Teacher record (direct match):', teacher);
  }
  
  // Try with ilike
  const { data: teacherIlike, error: teacherIlikeError } = await supabase
    .from('teachers')
    .select('*')
    .ilike('nik', nik)
    .maybeSingle();
    
  if (teacherIlikeError) {
    console.error('Teacher ilike error:', teacherIlikeError);
  } else {
    console.log('Teacher record (ilike match):', teacherIlike);
  }

  // Try fetching all teachers and checking manually
  const { data: allTeachers } = await supabase.from('teachers').select('id, name, nik, email');
  console.log('All teachers NIKs:', allTeachers?.map(t => `'${t.nik}'`));
}

checkNik();
