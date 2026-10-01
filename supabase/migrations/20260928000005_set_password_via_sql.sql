-- ============================================================
-- Fungsi bantuan: set/reset password akun guru langsung lewat SQL
-- (tanpa perlu buka Authentication > Users satu-satu di Dashboard).
-- Default password = NIK guru itu sendiri, sesuai konvensi yang
-- dipakai sekolah (kalau mau password lain, isi parameter kedua).
--
-- Contoh pemakaian (jalankan terpisah di SQL Editor, jangan disimpan
-- di file/migration supaya password tidak ikut tersimpan di Git):
--   SELECT set_teacher_password('<nik>');
-- ============================================================

CREATE OR REPLACE FUNCTION set_teacher_password(p_nik TEXT, p_password TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
  v_pw      TEXT;
BEGIN
  SELECT user_id, email INTO v_user_id, v_email FROM teachers WHERE nik = p_nik;

  IF v_email IS NULL THEN
    RETURN 'ERROR: Teacher NIK ' || p_nik || ' tidak ditemukan';
  END IF;

  IF v_user_id IS NULL THEN
    RETURN 'ERROR: NIK ' || p_nik || ' (' || v_email || ') belum punya akun Auth -- buat dulu lewat Authentication > Add User, lalu link_teacher_to_auth().';
  END IF;

  v_pw := COALESCE(p_password, p_nik);

  UPDATE auth.users
  SET encrypted_password = crypt(v_pw, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN 'OK: password NIK ' || p_nik || ' (' || v_email || ') di-set.';
END;
$$;
