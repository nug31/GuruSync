import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, GraduationCap } from 'lucide-react';
import { StudentForm } from './StudentForm';
import type { Student } from '../../types';

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Gagal menghapus siswa');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.nis.includes(searchQuery) ||
    student.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-container-low p-8 rounded-3xl border border-outline-variant shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <GraduationCap className="w-6 h-6" />
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em]">Academic Registry</span>
          </div>
          <h2 className="text-4xl font-display font-bold text-on-surface tracking-tight">Manajemen Siswa</h2>
          <p className="text-on-surface-variant/80 font-serif italic text-lg">Kelola data siswa, absensi, dan progres tugas akhir secara terpadu.</p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Siswa
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder="Cari nama, NIS, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
            <span className="px-3 py-1.5 bg-surface-container-high rounded-full">{filteredStudents.length} Siswa Terdaftar</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/30">
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Siswa</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">NIS</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Kelas</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-on-surface-variant font-medium">Memuat data siswa...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="w-12 h-12 text-outline mb-2" />
                      <p className="text-on-surface-variant font-medium text-lg">Belum ada data siswa</p>
                      <p className="text-on-surface-variant/60 text-sm">Mulai dengan menambahkan siswa baru ke dalam sistem.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-on-surface group-hover:text-primary transition-colors">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-on-surface-variant">{student.nis}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-bold text-[10px] uppercase">
                        {student.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{student.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingStudent(student);
                            setShowForm(true);
                          }}
                          className="p-2 hover:bg-primary-container hover:text-on-primary-container rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <StudentForm
          student={editingStudent}
          onClose={() => {
            setShowForm(false);
            loadStudents();
          }}
        />
      )}
    </div>
  );
}
