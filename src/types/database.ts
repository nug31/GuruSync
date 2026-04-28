export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: string
          nik: string | null
          avatar_url: string | null
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: string
          nik?: string | null
          avatar_url?: string | null
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          nik?: string | null
          avatar_url?: string | null
          name?: string | null
          created_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          user_id: string | null
          name: string
          nik: string
          subject: string
          email: string
          phone: string
          join_date: string
          avatar_url: string | null
          annual_leave_quota: number | null
          birth_date: string | null
          birth_place: string | null
          gender: string | null
          address: string | null
          education: string | null
          work_unit: string | null
          training_history: string | null
          sp_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          nik: string
          subject: string
          email: string
          phone: string
          join_date: string
          avatar_url?: string | null
          annual_leave_quota?: number | null
          birth_date?: string | null
          birth_place?: string | null
          gender?: string | null
          address?: string | null
          education?: string | null
          work_unit?: string | null
          training_history?: string | null
          sp_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          nik?: string
          subject?: string
          email?: string
          phone?: string
          join_date?: string
          avatar_url?: string | null
          annual_leave_quota?: number | null
          birth_date?: string | null
          birth_place?: string | null
          gender?: string | null
          address?: string | null
          education?: string | null
          work_unit?: string | null
          training_history?: string | null
          sp_level?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaves: {
        Row: {
          id: string
          teacher_id: string
          leave_type: string
          start_date: string
          end_date: string
          reason: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          leave_type: string
          start_date: string
          end_date: string
          reason: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          reason?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      resolve_nik_to_email: {
        Args: {
          p_nik: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
