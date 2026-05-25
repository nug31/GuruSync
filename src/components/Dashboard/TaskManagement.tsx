import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, BookCheck, Clock, Users } from 'lucide-react';
import { TaskForm } from './TaskForm';
import type { Task, Teacher, Student, StudentTask } from '../../types';

export function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, teachersRes, stRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('teachers').select('*').order('name'),
        supabase.from('student_tasks').select('*')
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
      if (stRes.data) setStudentTasks(stRes.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus tugas ini?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Gagal menghapus tugas');
    }
  };

  const getCompletionStats = (taskId: string) => {
    const relevant = studentTasks.filter(st => st.task_id === taskId);
    const completed = relevant.filter(st => st.status === 'completed').length;
    return { completed, total: relevant.length };
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-container-low p-8 rounded-3xl border border-outline-variant shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <BookCheck className="w-6 h-6" />
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em]">Assignment Control</span>
          </div>
          <h2 className="text-4xl font-display font-bold text-on-surface tracking-tight">Manajemen Tugas</h2>
          <p className="text-on-surface-variant/80 font-serif italic text-lg">Buat dan pantau pengerjaan tugas siswa sebelum ujian akhir.</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Tugas Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-low h-64 rounded-3xl animate-pulse border border-outline-variant" />
          ))
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant border-dashed">
             <BookCheck className="w-16 h-16 text-outline mx-auto mb-4 opacity-50" />
             <p className="text-on-surface-variant font-medium text-lg">Belum ada tugas yang dibuat</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const stats = getCompletionStats(task.id);
            const teacher = teachers.find(t => t.id === task.teacher_id);
            const isOverdue = task.deadline && new Date(task.deadline) < new Date();

            return (
              <div key={task.id} className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm hover:shadow-xl hover:border-primary/50 transition-all p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                    {task.subject}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setShowForm(true);
                      }}
                      className="p-2 hover:bg-primary-container rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 hover:bg-error-container rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-display font-bold text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-1">
                  {task.title}
                </h3>
                
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-6 min-h-[40px]">
                  {task.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-outline-variant">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Deadline</span>
                    </div>
                    <span className={`text-xs font-bold ${isOverdue ? 'text-error' : 'text-on-surface'}`}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-primary">{stats.completed}/{stats.total}</span>
                       <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {teacher && (
                  <div className="mt-6 pt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-[10px]">
                      {teacher.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-on-surface-variant">{teacher.name}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <TaskForm
          task={editingTask}
          teachers={teachers}
          onClose={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
