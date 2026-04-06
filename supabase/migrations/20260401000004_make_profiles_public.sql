-- Allow anyone (public) to read teacher profiles for QR scan
DROP POLICY IF EXISTS "Anyone can read teachers" ON teachers;
CREATE POLICY "Anyone can read teachers"
  ON teachers FOR SELECT
  TO public
  USING (true);

-- Allow anyone (public) to read leaves for the profile history
DROP POLICY IF EXISTS "Teachers can read own leaves" ON leaves;
DROP POLICY IF EXISTS "Admins can read all leaves" ON leaves;
DROP POLICY IF EXISTS "Management roles can read all leaves" ON leaves;

CREATE POLICY "Anyone can read leaves"
  ON leaves FOR SELECT
  TO public
  USING (true);
