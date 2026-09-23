export type SubjectCategory = 'jurusan' | 'normatif_adaptif';
export type Campus = 'utama' | 'kampus_03';

export type AppRole = 'admin' | 'teacher' | 'hod' | 'koordinator_hod' | 'wakasek' | 'kepsek';

export interface Teacher {
  id: string;
  user_id: string | null;
  name: string;
  nik: string;
  subject: string;
  subject_category: SubjectCategory;
  campus: Campus;
  app_role?: AppRole;
  position?: string;
  division?: string;
  wa_number?: string;
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
  tugas_luar_kampus?: Campus;
  tujuan_tugas_luar?: string;
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
