import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeacherList } from './TeacherList';
import { TeacherForm } from './TeacherForm';
import { TeacherProfile } from '../Profile/TeacherProfile';
import { LeaveManagement } from './LeaveManagement';
import { Statistics } from './Statistics';
import { AdminManagement } from './AdminManagement';
import { Users, Calendar, LogOut, Plus, BarChart3, ShieldCheck } from 'lucide-react';
import type { Teacher, Leave } from '../../types';

type View = 'dashboard' | 'teachers' | 'leaves' | 'admins';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let teachersQuery = supabase.from('teachers').select('*');
      let leavesQuery = supabase.from('leaves').select('*');

      if (!isAdmin && profile?.id) {
        teachersQuery = teachersQuery.eq('user_id', profile.id);
        // For leaves, we still want to fetch all IF the teacher is an approver, 
        // but for now let's focus on user identity.
        // Actually, if they are just a teacher, they only see their own leaves.
        leavesQuery = leavesQuery.eq('user_id', profile.id);
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-800">
                GuruSync
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {profile?.email} ({isAdmin ? 'Admin' : 'Guru'})
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-2 mb-6 bg-white p-2 rounded-lg shadow-sm">
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          {isAdmin ? (
            <button
              onClick={() => setView('teachers')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'teachers'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Data Guru</span>
            </button>
          ) : (
            <button
              onClick={() => setView('teachers')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'teachers'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Profil Saya</span>
            </button>
          )}

          {isAdmin ? (
            <>
              <button
                onClick={() => setView('leaves')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'leaves'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Manajemen Cuti</span>
              </button>
              <button
                onClick={() => setView('admins')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'admins'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Manajemen Admin</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('leaves')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'leaves'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Pengajuan Cuti</span>
            </button>
          )}
        </div>

        {view === 'dashboard' && (
          <Statistics teachers={teachers} leaves={leaves} />
        )}

        {view === 'teachers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isAdmin ? 'Data Guru' : 'Profil Saya'}
              </h2>
              {isAdmin && (
                <button
                  onClick={handleAddTeacher}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Guru</span>
                </button>
              )}
            </div>

            {isAdmin ? (
              <TeacherList
                teachers={teachers}
                leaves={leaves}
                onEdit={handleEditTeacher}
                onDelete={loadData}
                onRefresh={loadData}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {teachers[0] ? (
                  <TeacherProfile teacherId={teachers[0].id} />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    Data profil tidak ditemukan.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'leaves' && (
          <LeaveManagement
            teachers={teachers}
            leaves={leaves}
            onUpdate={loadData}
            currentTeacherId={teachers.find(t => t.user_id === profile?.id)?.id}
          />
        )}

        {view === 'admins' && isAdmin && (
          <AdminManagement />
        )}
      </div>

      {showTeacherForm && (
        <TeacherForm
          teacher={editingTeacher}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
