-- ============================================================
-- 1. link_teacher_to_auth() sebelumnya hardcode domain email lama
--    (@smkmmtwicaksana.sch.id) saat membuat baris profiles, padahal
--    akun Auth yang sebenarnya dibuat pakai domain lain (@gurusync.net).
--    Sekarang baca email asli dari auth.users supaya selalu konsisten
--    dengan akun Auth yang benar-benar dibuat lewat Dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION link_teacher_to_auth(p_nik TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_role_map   TEXT;
  v_email      TEXT;
BEGIN
  SELECT id, app_role INTO v_teacher_id, v_role_map FROM teachers WHERE nik = p_nik;
  IF v_teacher_id IS NULL THEN
    RETURN 'ERROR: Teacher NIK ' || p_nik || ' tidak ditemukan';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN 'ERROR: Auth user ' || p_user_id || ' tidak ditemukan';
  END IF;

  UPDATE teachers SET user_id = p_user_id WHERE nik = p_nik;

  INSERT INTO profiles (id, email, role)
  VALUES (p_user_id, v_email, v_role_map)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

  RETURN 'OK: NIK ' || p_nik || ' di-link sebagai ' || v_role_map || ' (' || v_email || ')';
END;
$$;

-- ============================================================
-- 2. Betulkan domain email Lispiyatmini (Kepsek) di tabel teachers,
--    masih pakai domain lama sebelum akunnya sempat dibuat.
-- ============================================================
UPDATE teachers SET email = '7012001@gurusync.net' WHERE nik = '7012001';

-- ============================================================
-- 3. Link akun Auth yang baru dibuat lewat Dashboard ke data guru
--    Lispiyatmini (Kepsek).
-- ============================================================
SELECT link_teacher_to_auth('7012001', '55e7fdbe-1066-4906-a78c-caab20f3bd9b');
