-- 1. Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  name text NOT NULL,
  nis text UNIQUE NOT NULL, -- Nomor Induk Siswa
  class text NOT NULL,
  email text NOT NULL,
  phone text,
  birth_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and Teachers can manage students"
  ON students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  class text NOT NULL, -- Added class field
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage their own tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.user_id = auth.uid()
      AND teachers.id = tasks.teacher_id
    ) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Create student_tasks table (Completion tracking)
CREATE TABLE IF NOT EXISTS student_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, task_id)
);

ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read and update their own task status"
  ON student_tasks FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update their own task status"
  ON student_tasks FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage student tasks"
  ON student_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- 4. Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active exams"
  ON exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage their own exams"
  ON exams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.user_id = auth.uid()
      AND teachers.id = exams.teacher_id
    ) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Create exam_questions table
CREATE TABLE IF NOT EXISTS exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL, -- Array of strings
  correct_answer text NOT NULL,
  points integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read questions of the exam they are taking"
  ON exam_questions FOR SELECT
  TO authenticated
  USING (true); -- Usually students only see this during the exam session

CREATE POLICY "Teachers can manage questions"
  ON exam_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- 6. Update resolve_nik_to_email function to support NIS
CREATE OR REPLACE FUNCTION resolve_nik_to_email(p_nik text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    -- 1. Check profiles (Admins) by NIK/Email
    SELECT email INTO v_email FROM profiles WHERE nik = p_nik OR email = p_nik LIMIT 1;
    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;
    
    -- 2. Check teachers by NIK/Email
    SELECT email INTO v_email FROM teachers WHERE nik = p_nik OR email = p_nik LIMIT 1;
    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;

    -- 3. Check students by NIS/Email
    SELECT email INTO v_email FROM students WHERE nis = p_nik OR email = p_nik LIMIT 1;
    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;

    -- 4. Check teachers by Birth Date (6 digits: DDMMYY)
    IF p_nik ~ '^\d{6}$' THEN
        SELECT email INTO v_email 
        FROM teachers 
        WHERE to_char(birth_date, 'DDMMYY') = p_nik 
        LIMIT 1;
        
        IF v_email IS NOT NULL THEN
            RETURN v_email;
        END IF;

        -- Also check students by Birth Date
        SELECT email INTO v_email 
        FROM students 
        WHERE to_char(birth_date, 'DDMMYY') = p_nik 
        LIMIT 1;
        
        IF v_email IS NOT NULL THEN
            RETURN v_email;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- 7. Add triggers for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_tasks_updated_at
  BEFORE UPDATE ON student_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
