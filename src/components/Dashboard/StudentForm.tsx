import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import type { Student } from '../../types';

interface StudentFormProps {
  student: Student | null;
  onClose: () => void;
}

export function StudentForm({ student, onClose }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    nis: '',
    class: '',
    email: '',
    phone: '',
    birth_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        nis: student.nis,
        class: student.class,
        email: student.email,
        phone: student.phone || '',
        birth_date: student.birth_date || '',
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (student) {
        const { error: updateError } = await supabase
          .from('students')
          .update(formData)
          .eq('id', student.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('students')
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
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h2 className="text-xl font-display font-bold text-on-surface">
            {student ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-medium border border-error/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                  NIS
                </label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="Contoh: 2024001"
                  required
                  disabled={!!student}
                />
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                  Kelas
                </label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="Contoh: XII-RPL-1"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="email@sekolah.sch.id"
                required
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Nomor Telepon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="0812..."
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md disabled:bg-primary/50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                student ? 'Update Siswa' : 'Simpan Siswa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
