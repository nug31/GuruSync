-- ============================================================
-- Guru boleh EDIT atau BATALKAN (hapus) pengajuan izin sendiri
-- selama statusnya masih pending (pending_hod/pending_wakasek/
-- pending_kepsek) -- tidak lagi dibatasi hanya di tahap pertama.
--
-- Kalau pengajuan yang diedit sudah lanjut melewati tahap pertama
-- (misal sudah disetujui HOD), hasil edit WAJIB kembali ke status
-- tahap pertama (atau pending_kepsek untuk Tugas Luar Kampus 03
-- fast-track) supaya direview ulang -- aturan ini dipaksa lewat
-- WITH CHECK, sama seperti aturan INSERT.
-- ============================================================

DROP POLICY IF EXISTS "Teachers can update own pending permissions" ON permissions;

CREATE POLICY "Teachers can update own pending permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND status IN ('pending_hod', 'pending_wakasek', 'pending_kepsek')
  )
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

DROP POLICY IF EXISTS "Teachers can delete own pending permissions" ON permissions;

CREATE POLICY "Teachers can delete own pending permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND status IN ('pending_hod', 'pending_wakasek', 'pending_kepsek')
  );
