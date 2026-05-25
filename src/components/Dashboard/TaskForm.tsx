import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, BookOpen } from 'lucide-react';
import type { Task, Teacher } from '../../types';

interface TaskFormProps {
  task: Task | null;
  teachers: Teacher[];
  onClose: () => void;
}

export function TaskForm({ task, teachers, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    class: '',
    deadline: '',
    teacher_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        subject: task.subject,
        class: task.class,
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        teacher_id: task.teacher_id,
      });
    } else if (teachers.length > 0) {
      setFormData(prev => ({ ...prev, teacher_id: teachers[0].id }));
    }
  }, [task, teachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (task) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(formData)
          .eq('id', task.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tasks')
          .insert([formData]);
        if (insertError) throw insertError;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-outline-variant animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-on-surface">
                {task ? 'Edit Tugas' : 'Buat Tugas Baru'}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Course Assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium border border-error/20">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                Judul Tugas
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                placeholder="Contoh: Analisis Algoritma Sorting"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                  placeholder="Contoh: Pemrograman Dasar"
                  required
                />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                  Target Kelas
                </label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                  placeholder="Contoh: XII-RPL-1"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                Tenggat Waktu
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full pl-11 pr-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                Instruksi Tugas
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface min-h-[120px] resize-none"
                placeholder="Jelaskan detail instruksi tugas di sini..."
                required
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
                Guru Pengampu
              </label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-5 py-3.5 bg-surface-container-low border border-outline rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface appearance-none"
                required
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-2xl transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 bg-primary text-on-primary text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:bg-primary/50 flex items-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                task ? 'Update Tugas' : 'Publikasikan Tugas'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
