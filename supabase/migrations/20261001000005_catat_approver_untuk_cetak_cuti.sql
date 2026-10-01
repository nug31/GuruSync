-- ============================================================
-- Catat SIAPA yang approve di tiap tahap (HOD/Wakasek/Kepsek),
-- supaya nama yang tercetak di Surat Cuti adalah yang benar-benar
-- approve -- sebelumnya ditebak dari role (salah kalau ada lebih
-- dari satu orang dengan role yang sama, misal beberapa Wakasek).
-- ============================================================

ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS hod_approved_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS wakasek_approved_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS kepsek_approved_by UUID REFERENCES teachers(id) ON DELETE SET NULL;
