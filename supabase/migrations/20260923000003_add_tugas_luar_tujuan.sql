-- ============================================================
-- Perbaikan: kolom "tugas_luar_kampus" berarti KAMPUS ASAL pengaju
-- (bukan kampus tujuan) -- salah paham sebelumnya menyebabkan guru
-- Kampus Utama yang tugas ke Kampus 03 malah di-routing ke Kepsek
-- Kampus 03, padahal seharusnya tetap ke Kepsek kampus dia sendiri.
--
-- Tambah kolom terpisah untuk keterangan tujuan/lokasi tugas luar
-- (teks bebas, tidak dipakai untuk routing approval).
-- ============================================================

ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS tujuan_tugas_luar TEXT;

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS tujuan_tugas_luar_only_for_tugas_luar;
ALTER TABLE permissions
ADD CONSTRAINT tujuan_tugas_luar_only_for_tugas_luar
  CHECK (tujuan_tugas_luar IS NULL OR permission_type = 'Tugas Luar');

COMMENT ON COLUMN permissions.tujuan_tugas_luar IS
  'Keterangan bebas tujuan/lokasi tugas luar (mis. "Workshop di Kampus 03", "Rapat Dinas Pendidikan"). Tidak memengaruhi alur approval.';

COMMENT ON COLUMN permissions.tugas_luar_kampus IS
  'KAMPUS ASAL pengaju (bukan tujuan). kampus_03 -> lewati HOD/Wakasek, langsung ke Kepsek Kampus 03. Hanya diisi untuk permission_type = Tugas Luar.';
