-- ============================================================
-- PERMISSIONS TABLE (Izin Guru)
-- Terpisah dari tabel 'leaves' (cuti tahunan)
-- Approval flow:
--   Cuti         : pending_hod -> pending_wakasek -> pending_kepsek -> approved
--   Lainnya      : pending_hod -> pending_wakasek -> approved
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN (
    'Sakit',
    'Cuti',
    'Tugas Luar',
    'Izin Keluar & Kembali',
    'Tidak Masuk',
    'Terlambat',
    'Izin Datang Terlambat',
    'Pulang Cepat'
  )),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  -- Field jam (untuk Terlambat, Pulang Cepat, Izin Keluar & Kembali)
  start_time    TIME,
  end_time      TIME,
  reason        TEXT NOT NULL,
  attachment_url TEXT,
  status        TEXT NOT NULL DEFAULT 'pending_hod' CHECK (status IN (
    'pending_hod',
    'pending_wakasek',
    'pending_kepsek',
    'approved',
    'rejected'
  )),
  -- Catatan penolakan dari approver
  rejection_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_permissions_updated_at();

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "Admin full access on permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Guru: baca izin milik sendiri
CREATE POLICY "Teachers can read own permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

-- Guru: ajukan izin baru (hanya status pending_hod)
CREATE POLICY "Teachers can insert own permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending_hod'
  );

-- Guru: edit izin sendiri yang masih pending_hod
CREATE POLICY "Teachers can update own pending permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending_hod'
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending_hod'
  );

-- Guru: hapus izin sendiri yang masih pending_hod
CREATE POLICY "Teachers can delete own pending permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending_hod'
  );

-- Management: baca semua izin
CREATE POLICY "Management can read all permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hod', 'koordinator_hod', 'wakasek', 'kepsek')
    )
  );

-- HOD / Koordinator HOD: approve/reject dari pending_hod
CREATE POLICY "HOD can update pending_hod permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hod', 'koordinator_hod')
    )
    AND status = 'pending_hod'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hod', 'koordinator_hod')
    )
  );

-- Wakasek: approve/reject dari pending_wakasek
CREATE POLICY "Wakasek can update pending_wakasek permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'wakasek'
    )
    AND status = 'pending_wakasek'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'wakasek'
    )
  );

-- Kepsek: approve/reject dari pending_kepsek (hanya untuk Cuti)
CREATE POLICY "Kepsek can update pending_kepsek permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'kepsek'
    )
    AND status = 'pending_kepsek'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'kepsek'
    )
  );
