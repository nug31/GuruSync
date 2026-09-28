-- ============================================================
-- "Terlambat" dan "Izin Datang Terlambat" sama artinya -> gabungkan
-- jadi satu jenis izin: "Terlambat".
-- ============================================================

-- 1. Pindahkan data lama yang masih pakai "Izin Datang Terlambat"
UPDATE permissions SET permission_type = 'Terlambat'
WHERE permission_type = 'Izin Datang Terlambat';

-- 2. Ganti CHECK constraint supaya "Izin Datang Terlambat" tidak lagi diterima
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_permission_type_check;

ALTER TABLE permissions ADD CONSTRAINT permissions_permission_type_check
  CHECK (permission_type IN (
    'Sakit',
    'Cuti',
    'Tugas Luar',
    'Izin Keluar & Kembali',
    'Tidak Masuk',
    'Terlambat',
    'Pulang Cepat'
  ));
