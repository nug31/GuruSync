import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Shield, Lock, Mail, User, Info } from 'lucide-react';
import type { Profile } from '../../types';

interface AdminFormProps {
  admin: Profile | null;
  onClose: () => void;
}

export function AdminForm({ admin, onClose }: AdminFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    email: '',
    password: '',
    avatar_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        nik: admin.nik || '',
        email: admin.email,
        password: '', // Password will not be loaded for security
        avatar_url: admin.avatar_url || '',
      });
    }
  }, [admin]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB');
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading:', err);
      alert('Gagal upload foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (admin) {
        // Update existing profile
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({
            name: formData.name,
            nik: formData.nik,
            email: formData.email,
            avatar_url: formData.avatar_url,
          })
          .eq('id', admin.id);

        if (updateError) throw updateError;
      } else {
        // Create new admin
        if (!formData.password) throw new Error('Password wajib diisi untuk admin baru');
        
        // We use the signUp from context but it might attempt to login
        // Better to just call signUp here directly to avoid context side-effects
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              role: 'admin',
              name: formData.name,
              nik: formData.nik,
            }
          }
        });

        if (signUpError) throw signUpError;

        // If user already exists but no profile, or signUp didn't auto-create profile
        if (data.user) {
          const { error: profileError } = await (supabase
            .from('profiles') as any)
            .upsert({
              id: data.user.id,
              email: formData.email,
              role: 'admin',
              name: formData.name,
              nik: formData.nik,
              avatar_url: formData.avatar_url,
            });
          
          if (profileError) throw profileError;
        }
      }

      onClose();
    } catch (err) {
      console.error('Error saving admin:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">
              {admin ? 'Edit Admin' : 'Tambah Admin Baru'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!admin && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700">
                Admin baru akan didaftarkan sebagai pengguna sistem. Silakan berikan Email dan Password kepada yang bersangkutan.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3 pb-4">
              <div className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                <span className="text-xs font-medium text-blue-600 hover:text-blue-500">
                  {formData.avatar_url ? 'Ubah Foto' : 'Pilih Foto (Maks 2MB)'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Nama Admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIK
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Nomor Induk Kependudukan"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="admin@sekolah.sch.id"
                  required
                />
              </div>
            </div>

            {!admin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Minimal 6 karakter"
                    required={!admin}
                    minLength={6}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 text-sm font-medium"
            >
              {loading ? 'Memproses...' : admin ? 'Update Admin' : 'Simpan Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
