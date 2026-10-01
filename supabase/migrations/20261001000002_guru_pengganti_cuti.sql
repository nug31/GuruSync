-- ============================================================
-- Tambah pilihan "Guru Pengganti" pada pengajuan Cuti.
-- Opsional, hanya relevan untuk permission_type = 'Cuti'.
-- ============================================================

ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS guru_pengganti_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE permissions
DROP CONSTRAINT IF EXISTS guru_pengganti_only_for_cuti;

ALTER TABLE permissions
ADD CONSTRAINT guru_pengganti_only_for_cuti
  CHECK (guru_pengganti_id IS NULL OR permission_type = 'Cuti');
