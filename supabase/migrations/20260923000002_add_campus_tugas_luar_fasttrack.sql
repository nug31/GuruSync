-- ============================================================
-- Kampus Utama vs Kampus 03:
--   - HOD/Koordinator MGMP TETAP satu pool bersama (tidak dipisah
--     per kampus) -- sesuai arahan, cukup dibedakan Jurusan/Normatif-Adaptif.
--   - Kepsek DIPISAH per kampus: Lispiyatmini (Kepsek Utama) dan
--     Putri Purwaningsih (Kepsek Kampus 03) TIDAK saling approve.
--   - Khusus pengajuan "Tugas Luar" yang ditandai dari Kampus 03,
--     alur di-skip langsung ke Kepsek Kampus 03 (lewati HOD & Wakasek).
-- ============================================================

-- 1. Tandai kampus tiap orang (guru & pimpinan)
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS campus TEXT NOT NULL DEFAULT 'utama'
  CHECK (campus IN ('utama', 'kampus_03'));

COMMENT ON COLUMN teachers.campus IS
  'utama = Kampus MM2100 (Kepsek: Lispiyatmini); kampus_03 = Kampus 03 (Kepsek: Putri Purwaningsih)';

-- 2. Tandai konteks kampus pada pengajuan "Tugas Luar" (dipilih saat submit, bukan otomatis dari profil guru)
ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS tugas_luar_kampus TEXT
  CHECK (tugas_luar_kampus IN ('utama', 'kampus_03'));

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS tugas_luar_kampus_only_for_tugas_luar;
ALTER TABLE permissions
ADD CONSTRAINT tugas_luar_kampus_only_for_tugas_luar
  CHECK (tugas_luar_kampus IS NULL OR permission_type = 'Tugas Luar');

COMMENT ON COLUMN permissions.tugas_luar_kampus IS
  'Hanya diisi untuk permission_type = Tugas Luar. kampus_03 -> lewati HOD/Wakasek, langsung ke Kepsek Kampus 03.';

-- 3. Izinkan guru insert pengajuan yang langsung mendarat di pending_kepsek,
--    KHUSUS untuk kombinasi Tugas Luar + Kampus 03 (fast-track).
DROP POLICY IF EXISTS "Teachers can insert own permissions" ON permissions;

CREATE POLICY "Teachers can insert own permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (
      status = 'pending_hod'
      OR (
        status = 'pending_kepsek'
        AND permission_type = 'Tugas Luar'
        AND tugas_luar_kampus = 'kampus_03'
      )
    )
  );

-- 4. Kepsek hanya boleh approve pengajuan yang kampusnya cocok dengan kampus dia sendiri:
--    - tugas_luar_kampus = 'kampus_03' -> hanya Kepsek yang teachers.campus = 'kampus_03'
--    - selain itu (Cuti / dst, tugas_luar_kampus NULL)      -> hanya Kepsek yang teachers.campus = 'utama'
DROP POLICY IF EXISTS "Kepsek can update pending_kepsek permissions" ON permissions;

CREATE POLICY "Kepsek can update pending_kepsek permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_kepsek'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'kepsek')
    AND COALESCE(tugas_luar_kampus, 'utama') = COALESCE(
      (SELECT t.campus FROM teachers t WHERE t.user_id = auth.uid() LIMIT 1),
      'utama'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'kepsek')
  );

-- 5. Tandai kampus untuk dua Kepsek yang sudah diketahui (aman dijalankan berkali-kali)
UPDATE teachers SET campus = 'kampus_03' WHERE nik = '8812010'; -- Putri Purwaningsih, Kepala Sekolah Kampus 03
-- Lispiyatmini (NIK 7012001, seed lama) tetap default 'utama', tidak perlu diubah.
