-- ============================================================
-- Aktifkan Supabase Realtime untuk tabel permissions & teachers,
-- supaya Monitoring Harian dan Manajemen Izin auto-update tanpa
-- perlu refresh manual saat ada pengajuan/persetujuan/perubahan
-- data guru dari pengguna lain.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teachers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teachers;
  END IF;
END $$;
