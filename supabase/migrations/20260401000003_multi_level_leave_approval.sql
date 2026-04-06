-- Update all existing 'pending' to 'pending_hod'
UPDATE leaves SET status = 'pending_hod' WHERE status = 'pending';

-- Drop old teacher policies
DROP POLICY IF EXISTS "Teachers can insert own leaves" ON leaves;
DROP POLICY IF EXISTS "Teachers can update own pending leaves" ON leaves;
DROP POLICY IF EXISTS "Teachers can delete own pending leaves" ON leaves;

-- Recreate teacher policies with new statuses
CREATE POLICY "Teachers can insert own leaves"
  ON leaves FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status IN ('pending_hod', 'pending_koor_hod')
  );

CREATE POLICY "Teachers can update own pending leaves"
  ON leaves FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status IN ('pending_hod', 'pending_koor_hod')
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status IN ('pending_hod', 'pending_koor_hod')
  );

CREATE POLICY "Teachers can delete own pending leaves"
  ON leaves FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status IN ('pending_hod', 'pending_koor_hod')
  );

-- Create policies for management
CREATE POLICY "Management roles can read all leaves"
  ON leaves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hod', 'koordinator_hod', 'wakasek', 'kepsek')
    )
  );

CREATE POLICY "Management can update leaves they are responsible for"
  ON leaves FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.role = 'hod' AND leaves.status = 'pending_hod') OR
        (profiles.role = 'koordinator_hod' AND leaves.status = 'pending_koor_hod') OR
        (profiles.role = 'wakasek' AND leaves.status = 'pending_wakasek') OR
        (profiles.role = 'kepsek' AND leaves.status = 'pending_kepsek')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hod', 'koordinator_hod', 'wakasek', 'kepsek')
    )
  );
