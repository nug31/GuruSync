-- ============================================================
-- Tambah dua kampus baru untuk teachers.campus:
--   kampus_02  = Kampus 02 (Pati)
--   asysyarif  = Asy-Syarif (Mojokerto)
-- Sebelumnya hanya 'utama' dan 'kampus_03'.
-- Jalur cepat Tugas Luar Kampus 03 (permissions.tugas_luar_kampus) TIDAK berubah.
-- ============================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.teachers'::regclass
      AND con.contype = 'c'
      AND att.attname = 'campus'
  LOOP
    EXECUTE format('ALTER TABLE teachers DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE teachers
ADD CONSTRAINT teachers_campus_check
  CHECK (campus IN ('utama', 'kampus_02', 'kampus_03', 'asysyarif'));
