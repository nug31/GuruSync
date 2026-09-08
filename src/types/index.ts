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

export type PermissionType =
  | 'Sakit'
  | 'Cuti'
  | 'Tugas Luar'
  | 'Izin Keluar & Kembali'
  | 'Tidak Masuk'
  | 'Terlambat'
  | 'Izin Datang Terlambat'
  | 'Pulang Cepat';

export type PermissionStatus =
  | 'pending_hod'
  | 'pending_wakasek'
  | 'pending_kepsek'
  | 'approved'
  | 'rejected';

export interface Permission {
  id: string;
  teacher_id: string;
  permission_type: PermissionType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason: string;
  attachment_url?: string;
  status: PermissionStatus;
  rejection_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'hod' | 'koordinator_hod' | 'wakasek' | 'kepsek' | 'student';
  nik?: string;
  avatar_url?: string;
  name?: string;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  name: string;
  nis: string;
  class: string;
  email: string;
  phone?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  subject: string;
  class: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentTask {
  id: string;
  student_id: string;
  task_id: string;
  status: 'pending' | 'completed';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
  created_at: string;
}

export interface TeacherWithLeaves extends Teacher {
  leaves?: Leave[];
}
