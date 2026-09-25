-- ============================================================
-- Guru Normatif-Adaptif LANGSUNG ke Wakasek (tanpa tahap Koordinator MGMP).
--   - Jurusan          : Guru -> HOD -> Wakasek (-> Kepsek untuk Cuti)
--   - Normatif-Adaptif : Guru -> Wakasek (-> Kepsek untuk Cuti)
-- Tugas Luar dari Kampus 03 tetap fast-track ke Kepsek Kampus 03.
-- ============================================================

-- 1. Pengajuan normatif-adaptif yang terlanjur menunggu di tahap HOD/MGMP -> pindah ke Wakasek
UPDATE permissions p SET status = 'pending_wakasek'
FROM teachers t
WHERE t.id = p.teacher_id
  AND t.subject_category = 'normatif_adaptif'
  AND p.status = 'pending_hod';

-- 2. INSERT: status awal tergantung kategori mapel guru
DROP POLICY IF EXISTS "Teachers can insert own permissions" ON permissions;

CREATE POLICY "Teachers can insert own permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (
      (status = 'pending_hod' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan'))
      OR (status = 'pending_wakasek' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif'))
      OR (status = 'pending_kepsek' AND permission_type = 'Tugas Luar' AND tugas_luar_kampus = 'kampus_03')
    )
  );

-- 3. Guru boleh edit/hapus pengajuan sendiri selama masih di tahap pertama
--    (jurusan: pending_hod, normatif-adaptif: pending_wakasek)
DROP POLICY IF EXISTS "Teachers can update own pending permissions" ON permissions;

CREATE POLICY "Teachers can update own pending permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (
      (status = 'pending_hod' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan'))
      OR (status = 'pending_wakasek' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif'))
    )
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (
      (status = 'pending_hod' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan'))
      OR (status = 'pending_wakasek' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif'))
    )
  );

DROP POLICY IF EXISTS "Teachers can delete own pending permissions" ON permissions;

CREATE POLICY "Teachers can delete own pending permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (
      (status = 'pending_hod' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan'))
      OR (status = 'pending_wakasek' AND EXISTS (
        SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif'))
    )
  );

-- 4. Tahap HOD sekarang hanya untuk guru Jurusan; Koordinator MGMP tidak lagi punya tahap approval
DROP POLICY IF EXISTS "HOD can update pending_hod permissions" ON permissions;

CREATE POLICY "HOD can update pending_hod permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_hod'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'hod')
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'hod')
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan')
  );
