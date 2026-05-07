import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeacherList } from './TeacherList';
import { TeacherForm } from './TeacherForm';
import { TeacherProfile } from '../Profile/TeacherProfile';
import { LeaveManagement } from './LeaveManagement';
import { Statistics } from './Statistics';
import { AdminManagement } from './AdminManagement';
import type { Teacher, Leave } from '../../types';

type View = 'dashboard' | 'teachers' | 'leaves' | 'admins';

export function Dashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const isAdmin = profile?.role === 'admin';
  const userName = isAdmin ? profile?.name : (teachers.find(t => t.user_id === user?.id)?.name || profile?.name);
  const userRole = isAdmin ? 'Admin' : 'Guru';

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.id, profile?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      let teachersQuery = supabase.from('teachers').select('*');
      let leavesQuery = supabase.from('leaves').select('*');

      const [teachersRes, leavesRes] = await Promise.all([
        teachersQuery.order('name'),
        leavesQuery.order('created_at', { ascending: false }),
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (leavesRes.data) setLeaves(leavesRes.data);
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
      <aside className="h-full w-72 fixed left-0 top-0 hidden lg:flex flex-col bg-surface-container-lowest border-r border-outline-variant z-50">
        <div className="flex flex-col h-full p-8">
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-primary tracking-tight">GuruSync</h1>
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mt-1">Institutional Portal</p>
          </div>
          
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-4 px-4 py-3 transition-colors text-left rounded-lg ${
                view === 'dashboard'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button
              onClick={() => setView('teachers')}
              className={`flex items-center gap-4 px-4 py-3 transition-colors text-left rounded-lg ${
                view === 'teachers'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">groups</span>
              <span>{isAdmin ? 'Data Guru' : 'Profil Guru'}</span>
            </button>
            
            <button
              onClick={() => setView('leaves')}
              className={`flex items-center gap-4 px-4 py-3 transition-colors text-left rounded-lg ${
                view === 'leaves'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">event_busy</span>
              <span>{isAdmin ? 'Manajemen Cuti' : 'Pengajuan Cuti'}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setView('admins')}
                className={`flex items-center gap-4 px-4 py-3 transition-colors text-left rounded-lg ${
                  view === 'admins'
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>Manajemen Admin</span>
              </button>
            )}
          </nav>
          
          <div className="mt-auto pt-8 border-t border-outline-variant flex flex-col gap-1">
            <button className="text-on-surface-variant hover:text-primary px-4 py-2 flex items-center gap-3 text-sm text-left">
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Bantuan</span>
            </button>
            <button 
              onClick={() => signOut()}
              className="text-on-surface-variant hover:text-error px-4 py-2 flex items-center gap-3 text-sm text-left"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* TopAppBar Component */}
      <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-18rem)] z-40 bg-surface/80 backdrop-blur-sm border-b border-outline-variant flex justify-between items-center px-6 lg:px-12 h-20">
        <div className="flex items-center gap-8">
          <span className="font-display text-2xl font-bold text-primary lg:hidden">GuruSync</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 pl-6 lg:border-l border-outline-variant">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-on-surface italic font-body">{userName || profile?.email}</p>
              <p className="label-caps text-[10px] text-on-surface-variant">{userRole}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display font-bold">
              {userName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="lg:ml-72 pt-20 min-h-screen px-4 lg:px-12 pb-24">
        {view === 'dashboard' && (
          <Statistics teachers={teachers} leaves={leaves} />
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
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-outline-variant pb-8">
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
                leaves={leaves}
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

        {view === 'leaves' && (
          <div className="py-8">
             <h2 className="text-3xl font-display text-on-surface mb-8">
                {isAdmin ? 'Manajemen Cuti' : 'Pengajuan Cuti'}
              </h2>
            <LeaveManagement
              teachers={teachers}
              leaves={leaves}
              onUpdate={loadData}
              currentTeacherId={teachers.find(t => t.user_id === profile?.id)?.id}
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
      </main>

      {/* BottomNavBar for Mobile */}
      <nav className="fixed bottom-0 left-0 w-full z-50 lg:hidden bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center h-20 px-4">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center justify-center transition-colors ${view === 'dashboard' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="label-caps text-[9px] mt-1">Beranda</span>
        </button>
        <button 
          onClick={() => setView('teachers')}
          className={`flex flex-col items-center justify-center transition-colors ${view === 'teachers' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined" data-icon="groups">groups</span>
          <span className="label-caps text-[9px] mt-1">Guru</span>
        </button>
        <button 
          onClick={() => setView('leaves')}
          className={`flex flex-col items-center justify-center transition-colors ${view === 'leaves' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined" data-icon="event_note">event_note</span>
          <span className="label-caps text-[9px] mt-1">Cuti</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setView('admins')}
            className={`flex flex-col items-center justify-center transition-colors ${view === 'admins' ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined" data-icon="admin_panel_settings">admin_panel_settings</span>
            <span className="label-caps text-[9px] mt-1">Admin</span>
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
