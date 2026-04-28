export interface Teacher {
  id: string;
  user_id: string | null;
  name: string;
  nik: string;
  subject: string;
  email: string;
  phone: string;
  join_date: string;
  avatar_url?: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  address?: string;
  education?: string;
  work_unit?: string;
  annual_leave_quota?: number;
  training_history?: string;
  sp_level?: string;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  teacher_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending_hod' | 'pending_koor_hod' | 'pending_wakasek' | 'pending_kepsek' | 'approved' | 'rejected' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'hod' | 'koordinator_hod' | 'wakasek' | 'kepsek';
  nik?: string;
  avatar_url?: string;
  name?: string;
  created_at: string;
}

export interface TeacherWithLeaves extends Teacher {
  leaves?: Leave[];
}
