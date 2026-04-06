-- Allow teachers to apply for leave
CREATE POLICY "Teachers can insert own leaves"
  ON leaves FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Allow teachers to update their own pending leaves
CREATE POLICY "Teachers can update own pending leaves"
  ON leaves FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Allow teachers to delete their own pending leaves
CREATE POLICY "Teachers can delete own pending leaves"
  ON leaves FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );
