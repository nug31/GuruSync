import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeacherList } from './TeacherList';
import { TeacherForm } from './TeacherForm';
import { TeacherProfile } from '../Profile/TeacherProfile';
import { Statistics } from './Statistics';
import { AdminManagement } from './AdminManagement';
import { StudentManagement } from './StudentManagement';
import { TaskManagement } from './TaskManagement';
import { ExamManagement } from './ExamManagement';
import { StudentDashboard } from './StudentDashboard';
import { PermissionManagement } from './PermissionManagement';
import type { Teacher, Permission } from '../../types';

type View = 'dashboard' | 'teachers' | 'permissions' | 'admins' | 'students' | 'tasks' | 'exams';

export function Dashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student';
  const isTeacher = profile?.role === 'teacher' || ['hod', 'koordinator_hod', 'wakasek', 'kepsek'].includes(profile?.role || '');
  
  const userName = isAdmin ? profile?.name : (teachers.find(t => t.user_id === user?.id)?.name || profile?.name);
  const userRole = isAdmin ? 'Admin' : isStudent ? 'Siswa' : 'Guru';

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.id, profile?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      let teachersQuery = supabase.from('teachers').select('*');
      let permissionsQuery = supabase.from('permissions').select('*');

      const [teachersRes, permissionsRes] = await Promise.all([
        teachersQuery.order('name'),
        permissionsQuery.order('created_at', { ascending: false }),
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setShowTeacherForm(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowTeacherForm(true);
  };

  const handleCloseForm = () => {
    setShowTeacherForm(false);
    setEditingTeacher(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant font-body">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      {/* SideNavBar Component */}
      <aside className="h-full w-72 fixed left-0 top-0 hidden lg:flex flex-col bg-white border-r border-slate-200/80 z-50 shadow-sm">
        <div className="flex flex-col h-full p-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-md shadow-primary/25">
              <span className="material-symbols-outlined text-[22px]">school</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight font-display">GuruSync</h1>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Portal Kepegawaian</p>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-3.5 px-4 py-3 transition-all duration-200 text-left rounded-xl text-sm font-semibold ${
                view === 'dashboard'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-600 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => setView('teachers')}
              className={`flex items-center gap-3.5 px-4 py-3 transition-all duration-200 text-left rounded-xl text-sm font-semibold ${
                view === 'teachers'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-600 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">groups</span>
              <span>{isAdmin ? 'Data Guru' : 'Profil Guru'}</span>
            </button>
            
            <button
              onClick={() => setView('permissions')}
              className={`flex items-center gap-3.5 px-4 py-3 transition-all duration-200 text-left rounded-xl text-sm font-semibold ${
                view === 'permissions'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-600 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
              <span>{isAdmin ? 'Manajemen Izin' : 'Pengajuan Izin'}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setView('admins')}
                className={`flex items-center gap-3.5 px-4 py-3 transition-all duration-200 text-left rounded-xl text-sm font-semibold ${
                  view === 'admins'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>Manajemen Admin</span>
              </button>
            )}
          </nav>
          
          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-1">
            <button className="text-slate-500 hover:text-primary hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm text-left transition-colors">
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Bantuan</span>
            </button>
            <button 
              onClick={() => signOut()}
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm text-left transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* TopAppBar Component */}
      <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-18rem)] z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center px-6 lg:px-10 h-20">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">school</span>
          </div>
          <span className="font-display text-xl font-extrabold text-primary">GuruSync</span>
        </div>
        
        <div className="hidden lg:block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Portal Kepegawaian & Administrasi</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 lg:border-l border-slate-200/80">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none">{userName || profile?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-100 uppercase tracking-wider">
                {userRole}
              </span>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {userName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="lg:ml-72 pt-20 min-h-screen px-4 lg:px-12 pb-24">
        {view === 'dashboard' && (
          isStudent ? (
            <StudentDashboard />
          ) : (
            <Statistics teachers={teachers} permissions={permissions} />
          )
        )}

        {view === 'teachers' && (
          <div className="py-8">
            {isAdmin ? (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-outline-variant pb-8">
                <div>
                  <nav className="flex items-center gap-2 text-on-surface-variant/70 font-label text-[10px] mb-4">
                    <span>Management</span>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span className="text-primary font-bold">Teachers Registry</span>
                  </nav>
                  <h2 className="font-display text-4xl text-on-surface font-bold tracking-tight mb-4">Manajemen Data Guru</h2>
                  <p className="font-serif italic text-lg text-on-surface-variant/80 max-w-3xl">Kelola informasi profil, status kepegawaian, dan riwayat pelatihan staf pengajar dalam satu dashboard terintegrasi.</p>
                </div>
                <button onClick={handleAddTeacher} className="flex items-center justify-center gap-3 bg-primary text-on-primary px-8 py-3 rounded-sm font-bold text-sm hover:bg-primary/90 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Tambah Guru Baru
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4 border-b border-outline-variant pb-4">
                <div>
                  <nav className="flex items-center gap-2 text-on-surface-variant/70 font-label text-[10px] mb-4">
                    <span>Personal</span>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span className="text-primary font-bold">Profile</span>
                  </nav>
                  <h2 className="font-display text-4xl text-on-surface font-bold tracking-tight mb-4">Profil Saya</h2>
                  <p className="font-serif italic text-lg text-on-surface-variant/80 max-w-3xl">Kelola informasi profil dan riwayat akademik Anda.</p>
                </div>
              </div>
            )}

            {isAdmin ? (
              <TeacherList
                teachers={teachers}
                onEdit={handleEditTeacher}
                onDelete={loadData}
                onRefresh={loadData}
              />
            ) : (
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant">
                {teachers.find(t => t.user_id === user?.id) ? (
                  <TeacherProfile teacherId={teachers.find(t => t.user_id === user?.id)!.id} />
                ) : (
                  <div className="p-8 text-center text-on-surface-variant font-body">
                    Data profil tidak ditemukan.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'permissions' && (
          <div className="py-8">
            <PermissionManagement
              teachers={teachers}
              permissions={permissions}
              onUpdate={loadData}
              currentTeacherId={teachers.find(t => t.user_id === user?.id)?.id}
            />
          </div>
        )}

        {view === 'admins' && isAdmin && (
          <div className="py-8">
            <h2 className="text-3xl font-display text-on-surface mb-8">
                Manajemen Admin
            </h2>
            <AdminManagement />
          </div>
        )}

        {view === 'students' && (isAdmin || isTeacher) && (
          <div className="py-8">
            <StudentManagement />
          </div>
        )}

        {view === 'tasks' && (isAdmin || isTeacher) && (
          <div className="py-8">
            <TaskManagement />
          </div>
        )}

        {view === 'exams' && (isAdmin || isTeacher) && (
          <div className="py-8">
            <ExamManagement />
          </div>
        )}
      </main>

      {/* BottomNavBar for Mobile */}
      <nav className="fixed bottom-0 left-0 w-full z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex justify-around items-center h-16 px-4 shadow-lg">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${view === 'dashboard' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="text-[10px] font-semibold mt-0.5">Beranda</span>
        </button>
        <button 
          onClick={() => setView('teachers')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${view === 'teachers' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <span className="material-symbols-outlined text-[22px]">groups</span>
          <span className="text-[10px] font-semibold mt-0.5">Guru</span>
        </button>
        <button 
          onClick={() => setView('permissions')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${view === 'permissions' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <span className="material-symbols-outlined text-[22px]">assignment_late</span>
          <span className="text-[10px] font-semibold mt-0.5">Izin</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setView('admins')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${view === 'admins' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'}`}
          >
            <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
            <span className="text-[10px] font-semibold mt-0.5">Admin</span>
          </button>
        )}

      </nav>

      {showTeacherForm && (
        <TeacherForm
          teacher={editingTeacher}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
