import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Plus, Trash2, Edit2 } from 'lucide-react';
import type { Profile } from '../../types';
import { AdminForm } from './AdminForm';

export function AdminManagement() {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setAdmins(data as Profile[]);
    } catch (err) {
      console.error('Error loading admins:', err);
      setError('Gagal memuat data admin');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus admin ini?')) return;

    try {
      // Note: This only deletes from profiles, not auth.users unless using service role
      const { error } = await (supabase
        .from('profiles') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      alert('Gagal menghapus admin');
    }
  };

  const handleEdit = (admin: Profile) => {
    setEditingAdmin(admin);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Admin</h2>
        <button
          onClick={() => {
            setEditingAdmin(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Admin</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NIK
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      {admin.avatar_url ? (
                        <img src={admin.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <Shield className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {admin.name || 'Admin'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{admin.nik || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(admin)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Belum ada admin terpilih.
          </div>
        )}
      </div>

      {showForm && (
        <AdminForm
          admin={editingAdmin}
          onClose={() => {
            setShowForm(false);
            loadAdmins();
          }}
        />
      )}
    </div>
  );
}
