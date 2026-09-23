-- ============================================================
-- Bedakan guru jurusan (produktif/kejuruan) vs normatif-adaptif,
-- lalu batasi siapa yang boleh approve tahap pertama:
--   - HOD (role 'hod')            -> hanya guru subject_category = 'jurusan'
--   - Koordinator MGMP ('koordinator_hod') -> hanya 'normatif_adaptif'
-- Sebelumnya kedua role bisa approve pengajuan siapa saja.
-- ============================================================

ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS subject_category TEXT NOT NULL DEFAULT 'normatif_adaptif'
  CHECK (subject_category IN ('jurusan', 'normatif_adaptif'));

COMMENT ON COLUMN teachers.subject_category IS
  'jurusan = guru mapel produktif/kejuruan (di-approve HOD); normatif_adaptif = guru mapel normatif/adaptif (di-approve Koordinator MGMP)';

-- Ganti policy approve tahap HOD/MGMP supaya scoped ke kategori yang sesuai
DROP POLICY IF EXISTS "HOD can update pending_hod permissions" ON permissions;

CREATE POLICY "HOD can update pending_hod permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_hod'
    AND (
      (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'hod')
        AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan')
      )
      OR
      (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'koordinator_hod')
        AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif')
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'hod')
      AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'jurusan')
    )
    OR
    (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'koordinator_hod')
      AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = permissions.teacher_id AND t.subject_category = 'normatif_adaptif')
    )
  );
