-- ============================================================
-- Root cause dari "NIK/Email tidak terdaftar" saat coba login:
-- NIK baru (851766 dst, dari roster terbaru) belum pernah ditulis
-- ke tabel teachers -- yang tersimpan masih NIK placeholder lama
-- dari seed 20260911000001 (7012xxx).
--
-- Ternyata semua 16 orang di roster baru SUDAH dibuatkan baris
-- teachers baru secara manual (lewat menu Data Guru) dan SUDAH
-- ter-link ke akun Auth (user_id terisi) -- baris lama (7012xxx)
-- jadi duplikat yang tidak terpakai. Migration ini:
--   1. Melengkapi data (position/kategori mapel/kampus/role) di
--      baris BARU yang sudah ter-link (bukan baris lama).
--   2. Menghapus baris lama yang jadi duplikat & tidak ter-link.
--   3. Perbaiki link_teacher_to_auth() supaya baca role eksplisit
--      dari teachers.app_role, bukan menebak dari teks "position"
--      (sebelumnya rapuh: begitu jabatan diisi lebih spesifik
--      seperti "Waka Bid. Humas"/"HOD TITL", tidak ada yang cocok
--      dan semua orang diam-diam jatuh ke role 'teacher').
-- ============================================================

-- 1. Kolom role eksplisit (menggantikan tebak-tebakan dari position)
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS app_role TEXT NOT NULL DEFAULT 'teacher'
  CHECK (app_role IN ('admin', 'teacher', 'hod', 'koordinator_hod', 'wakasek', 'kepsek'));

COMMENT ON COLUMN teachers.app_role IS
  'Role aplikasi yang akan dipakai link_teacher_to_auth() saat akun Auth di-link. Diisi eksplisit, tidak lagi ditebak dari kolom position.';

-- 2. Lispiyatmini (NIK tidak berubah): pastikan app_role terisi benar.
UPDATE teachers SET app_role = 'kepsek', campus = 'utama'
WHERE nik = '7012001';

-- 3. Lengkapi data di baris BARU (sudah ada & sudah ter-link user_id).
--    name TIDAK disentuh -- sudah benar, diisi sendiri sebelumnya.

UPDATE teachers SET
  email = '8812010@smkmmtwicaksana.sch.id', phone = COALESCE(phone, '085710486710'),
  position = 'Kepala Sekolah MI 03', division = 'Pimpinan Kampus 03',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'),
  join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'kepsek', campus = 'kampus_03'
WHERE nik = '8812010';

UPDATE teachers SET
  phone = COALESCE(phone, '081290244416'), position = 'Waka Purchasing', division = 'Purchasing',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'wakasek', campus = 'utama'
WHERE nik = '861880';

UPDATE teachers SET
  phone = COALESCE(phone, '085220907987'), position = 'Waka Bid. Kesiswaan', division = 'Kesiswaan & GA',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'wakasek', campus = 'utama'
WHERE nik = '8814030';

UPDATE teachers SET
  phone = COALESCE(phone, '087837155685'), position = 'PLT Waka Humas Hubin', division = 'Humas & Hubind',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'wakasek', campus = 'utama'
WHERE nik = '951883';

UPDATE teachers SET
  phone = COALESCE(phone, '082112847033'), position = 'Waka Bid. Kurikulum', division = 'Kurikulum',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'wakasek', campus = 'utama'
WHERE nik = '8713012';

-- Aprilia Rahayu: Wadir Polmind -- sesuai arahan TIDAK diberi akses approval (app_role tetap 'teacher').
UPDATE teachers SET
  phone = COALESCE(phone, '081932580977'), position = 'Wadir Polmind', division = 'Polmind',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'teacher', campus = 'utama'
WHERE nik = '9417064';

-- NIK 7012008 (Ryo Maytana, HOD TKI) -- tidak ada di roster baru, sengaja tidak diubah/dihapus.
-- Cek manual apakah beliau masih menjabat.

UPDATE teachers SET
  phone = COALESCE(phone, '082295444559'), position = 'HOD TSM', division = 'TSM',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '8915049';

UPDATE teachers SET
  phone = COALESCE(phone, '082218005572'), position = 'HOD TITL', division = 'TITL',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '911770';

UPDATE teachers SET
  phone = COALESCE(phone, '081297083722'), position = 'HOD Elind', division = 'Elind',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '9518078';

UPDATE teachers SET
  phone = COALESCE(phone, '085319953225'), position = 'HOD Akuntansi', division = 'Akuntansi',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '8814034';

UPDATE teachers SET
  phone = COALESCE(phone, '081291506911'), position = 'HOD Hotel', division = 'Perhotelan',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '8813018';

UPDATE teachers SET
  phone = COALESCE(phone, '082260878861'), position = 'HOD TKR', division = 'TKR',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '851766';

-- Heru Triatmo: dulu HOD Mesin -> sekarang Waka Koord. HOD (Koordinator MGMP)
UPDATE teachers SET
  phone = COALESCE(phone, '083898079307'), position = 'Waka Koord. HOD', division = 'Koordinator MGMP',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'koordinator_hod', subject_category = 'normatif_adaptif', campus = 'utama'
WHERE nik = '9014021';

UPDATE teachers SET
  phone = COALESCE(phone, '081212772973'), position = 'Waka Bid. Humas', division = 'Humas',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'wakasek', subject_category = 'normatif_adaptif', campus = 'utama'
WHERE nik = '9115043';

UPDATE teachers SET
  phone = COALESCE(phone, '089522956292'), position = 'HOD Mesin', division = 'Mesin / Pemesinan',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri MM2100'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'utama'
WHERE nik = '200897';

UPDATE teachers SET
  phone = COALESCE(phone, '082210345111'), position = 'HOD TSM', division = 'TSM',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri Kampus 03'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'kampus_03'
WHERE nik = '881882';

UPDATE teachers SET
  phone = COALESCE(phone, '082162683132'), position = 'HOD TKR', division = 'TKR',
  work_unit = COALESCE(work_unit, 'SMK Mitra Industri Kampus 03'), join_date = COALESCE(join_date, '2020-01-01'),
  app_role = 'hod', subject_category = 'jurusan', campus = 'kampus_03'
WHERE nik = '9520107';

-- 4. Hapus baris LAMA yang jadi duplikat (sudah digantikan baris NIK baru di atas)
--    -- hanya yang belum pernah ter-link ke akun manapun, untuk jaga-jaga.
DELETE FROM teachers WHERE nik IN (
  '7012002','7012003','7012004','7012005','7012006','7012007',
  '7012009','7012010','7012011','7012012','7012013','7012014','7012015'
) AND user_id IS NULL;

-- 5. link_teacher_to_auth() sekarang baca teachers.app_role langsung, bukan menebak dari position
CREATE OR REPLACE FUNCTION link_teacher_to_auth(p_nik TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_role_map   TEXT;
BEGIN
  SELECT id, app_role INTO v_teacher_id, v_role_map FROM teachers WHERE nik = p_nik;
  IF v_teacher_id IS NULL THEN
    RETURN 'ERROR: Teacher NIK ' || p_nik || ' tidak ditemukan';
  END IF;

  UPDATE teachers SET user_id = p_user_id WHERE nik = p_nik;

  INSERT INTO profiles (id, email, role)
  VALUES (p_user_id, p_nik || '@smkmmtwicaksana.sch.id', v_role_map)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

  RETURN 'OK: NIK ' || p_nik || ' di-link sebagai ' || v_role_map;
END;
$$;

-- 6. Semua orang di atas SUDAH ter-link (user_id sudah terisi lebih dulu, jadi
--    link_teacher_to_auth() di atas tidak pernah kepanggil untuk mereka -- dan
--    kalaupun sempat dipanggil, versi LAMA fungsi ini menebak role dari
--    "position" yang saat itu masih NULL -> semua orang jatuh ke role 'teacher').
--    UPSERT (bukan UPDATE) supaya tetap benar walau baris profiles-nya belum ada.
INSERT INTO profiles (id, email, role)
SELECT t.user_id, t.nik || '@smkmmtwicaksana.sch.id', t.app_role
FROM teachers t
WHERE t.user_id IS NOT NULL
  AND t.nik IN (
    '7012001','8812010','861880','8814030','951883','8713012','9417064',
    '8915049','911770','9518078','8814034','8813018','851766','9014021',
    '9115043','200897','881882','9520107'
  )
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;
