-- ============================================================
-- SEED DATA: Leader HOD, Wakasek, Kepsek
-- NIK Bu Lis (Kepsek): 7012001
-- NIK lainnya: 7012002 - 7012015
-- user_id = NULL dulu, link setelah buat akun Auth
-- ============================================================

-- 1. TAMBAH KOLOM TAMBAHAN KE TABEL teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS wa_number TEXT;

-- 2. INSERT DATA LEADERS
-- join_date pakai placeholder 2020-01-01 (kolom ini NOT NULL di skema awal) -- koreksi manual lewat menu Data Guru kalau perlu.
INSERT INTO teachers (name, nik, subject, email, phone, position, division, work_unit, join_date)
VALUES
  ('Lispiyatmini, M.Pd',       '7012001', 'Kepala Sekolah',  '7012001@smkmmtwicaksana.sch.id', '08121117191',  'Kepala Sekolah',           'MM2100',           'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Putri Purwaningsih, S.Pd', '7012002', 'Manajemen',       '7012002@smkmmtwicaksana.sch.id', '085710486710', 'BOS / Kepala Sekolah 03',  'Pimpinan',         'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Elis Rika Sugiarti',       '7012003', 'Purchasing',      '7012003@smkmmtwicaksana.sch.id', '081290244416', 'Wakasek',                  'Purchasing',       'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Abdul Munir',              '7012004', 'Kesiswaan',       '7012004@smkmmtwicaksana.sch.id', '085220907987', 'Wakasek',                  'Kesiswaan & GA',   'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Puspita Sari, S.Pd',       '7012005', 'Humas',           '7012005@smkmmtwicaksana.sch.id', '087837155685', 'Wakasek',                  'Humas & Hubind',   'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Nuryana Fitriyani',        '7012006', 'Kurikulum',       '7012006@smkmmtwicaksana.sch.id', '082112847033', 'Wakasek',                  'Kurikulum',        'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Aprilia Rahayu Wilujeng',  '7012007', 'TEFA',            '7012007@smkmmtwicaksana.sch.id', '081932580977', 'Koordinator HOD / TEFA',   'Koordinator TEFA', 'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Ryo Maytana',              '7012008', 'TKI',             '7012008@smkmmtwicaksana.sch.id', '08988816828',  'HOD',                      'TKI',              'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Okxy Ixganda',             '7012009', 'TSM',             '7012009@smkmmtwicaksana.sch.id', '082295444559', 'HOD',                      'TSM',              'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Astri Afmi Wulandari',     '7012010', 'Listrik',         '7012010@smkmmtwicaksana.sch.id', '082218005572', 'HOD',                      'Listrik',          'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Eldha Luvyzha',            '7012011', 'ELIND',           '7012011@smkmmtwicaksana.sch.id', '081297083722', 'HOD',                      'ELIND',            'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Kiki Widhia Swara',        '7012012', 'Akuntansi',       '7012012@smkmmtwicaksana.sch.id', '085319953225', 'HOD',                      'Akuntansi',        'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Refty Royan',              '7012013', 'Perhotelan',      '7012013@smkmmtwicaksana.sch.id', '081291506911', 'HOD',                      'Perhotelan',       'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Abdillah Putra',           '7012014', 'TKR',             '7012014@smkmmtwicaksana.sch.id', '082260878861', 'HOD',                      'TKR',              'SMK Mitra Industri MM2100', '2020-01-01'),
  ('Heru Triatmo',             '7012015', 'Mesin',           '7012015@smkmmtwicaksana.sch.id', '083898079307', 'HOD',                      'Mesin / Pemesinan','SMK Mitra Industri MM2100', '2020-01-01')
ON CONFLICT (nik) DO UPDATE SET
  name      = EXCLUDED.name,
  phone     = EXCLUDED.phone,
  position  = EXCLUDED.position,
  division  = EXCLUDED.division,
  work_unit = EXCLUDED.work_unit;

-- 3. FUNCTION: Link teacher ke Supabase Auth setelah akun dibuat
CREATE OR REPLACE FUNCTION link_teacher_to_auth(p_nik TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_role_map   TEXT;
BEGIN
  SELECT id INTO v_teacher_id FROM teachers WHERE nik = p_nik;
  IF v_teacher_id IS NULL THEN
    RETURN 'ERROR: Teacher NIK ' || p_nik || ' tidak ditemukan';
  END IF;

  UPDATE teachers SET user_id = p_user_id WHERE nik = p_nik;

  SELECT CASE
    WHEN position = 'Kepala Sekolah'           THEN 'kepsek'
    WHEN position = 'BOS / Kepala Sekolah 03'  THEN 'admin'
    WHEN position = 'Wakasek'                  THEN 'wakasek'
    WHEN position = 'Koordinator HOD / TEFA'   THEN 'koordinator_hod'
    WHEN position = 'HOD'                      THEN 'hod'
    ELSE 'teacher'
  END INTO v_role_map
  FROM teachers WHERE nik = p_nik;

  INSERT INTO profiles (id, email, role)
  VALUES (p_user_id, p_nik || '@smkmmtwicaksana.sch.id', v_role_map)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

  RETURN 'OK: NIK ' || p_nik || ' di-link sebagai ' || v_role_map;
END;
$$;

-- ============================================================
-- CARA MEMBUAT AKUN LOGIN (lakukan per orang):
-- 1. Supabase Dashboard > Authentication > Users > Add user
-- 2. Email: 7012001@smkmmtwicaksana.sch.id
--    Password: 7012001  (minta ganti saat pertama login)
-- 3. Copy UUID user yang baru dibuat
-- 4. Jalankan di SQL Editor:
--    SELECT link_teacher_to_auth('7012001', 'paste-uuid-disini');
-- ============================================================
