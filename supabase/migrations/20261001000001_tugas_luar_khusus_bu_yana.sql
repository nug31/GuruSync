-- ============================================================
-- Khusus jenis izin "Tugas Luar": tahap Wakasek dikunci ke SATU
-- orang (Bu Yana / Nuryana Fitriyani), bukan Wakasek manapun.
-- Tahap HOD untuk guru Jurusan TIDAK berubah. Jalur cepat Tugas Luar
-- dari Kampus 03 (langsung ke Kepsek Kampus 03) juga TIDAK berubah.
--
-- Dibuat sebagai kolom (bukan hardcode nama), supaya bisa dipindah
-- ke Wakasek lain kapan saja lewat menu Data Guru tanpa ubah kode.
-- ============================================================

ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS tugas_luar_approver BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN teachers.tugas_luar_approver IS
  'Kalau true dan app_role=wakasek: satu-satunya Wakasek yang berwenang approve tahap Wakasek untuk jenis izin Tugas Luar (Wakasek lain tidak bisa approve Tugas Luar, tapi tetap bisa approve jenis izin lain).';

UPDATE teachers SET tugas_luar_approver = true WHERE nik = '8713012'; -- Nuryana Fitriyani (Bu Yana)

DROP POLICY IF EXISTS "Wakasek can update pending_wakasek permissions" ON permissions;

CREATE POLICY "Wakasek can update pending_wakasek permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_wakasek'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'wakasek'
    )
    AND (
      permission_type <> 'Tugas Luar'
      OR EXISTS (
        SELECT 1 FROM teachers t
        WHERE t.user_id = auth.uid() AND t.tugas_luar_approver = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'wakasek'
    )
  );
