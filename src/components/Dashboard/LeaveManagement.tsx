import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, CheckCircle, XCircle, Clock, FileSpreadsheet, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import type { Teacher, Leave } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveManagementProps {
  teachers: Teacher[];
  leaves: Leave[];
  onUpdate: () => void;
  currentTeacherId?: string;
}

export function LeaveManagement({ teachers, leaves, onUpdate, currentTeacherId }: LeaveManagementProps) {
  const { profile } = useAuth();
  
  const role = profile?.role || 'teacher';
  const isAdmin = role === 'admin';
  const isManagement = ['hod', 'koordinator_hod', 'wakasek', 'kepsek', 'admin'].includes(role);

  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [formData, setFormData] = useState<{
    teacher_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: Leave['status'];
  }>({
    teacher_id: currentTeacherId || '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'pending_hod',
  });
  const [loading, setLoading] = useState(false);

  // Filter leaves: teachers see their own; management/admin see all
  const displayLeaves = isManagement 
    ? leaves 
    : leaves.filter(leave => leave.teacher_id === currentTeacherId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine initial pending status based on role
      const initialStatus = role === 'hod' ? 'pending_koor_hod' : 'pending_hod';
      
      const submissionData = isAdmin ? formData : {
        ...formData,
        teacher_id: currentTeacherId!,
        status: editingLeave ? formData.status : initialStatus as Leave['status']
      };

      if (editingLeave) {
        const { error } = await supabase
          .from('leaves')
          .update(submissionData as any)
          .eq('id', editingLeave.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leaves')
          .insert([submissionData as any]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingLeave(null);
      setFormData({
        teacher_id: currentTeacherId || '',
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        status: 'pending_hod',
      });
      onUpdate();
    } catch (error) {
      alert('Gagal menyimpan data cuti');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (leave: Leave) => {
    setEditingLeave(leave);
    setFormData({
      teacher_id: leave.teacher_id,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason,
      status: leave.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (leaveId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data cuti ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      alert('Gagal menghapus data cuti');
      console.error(error);
    }
  };

  const handleStatusUpdate = async (leaveId: string, action: 'approve' | 'reject', currentStatus: Leave['status']) => {
    let nextStatus: Leave['status'] = 'rejected';

    if (action === 'approve') {
      if (isAdmin) nextStatus = 'approved';
      else if (role === 'hod' && currentStatus === 'pending_hod') nextStatus = 'pending_wakasek';
      else if (role === 'koordinator_hod' && currentStatus === 'pending_koor_hod') nextStatus = 'pending_wakasek';
      else if (role === 'wakasek' && currentStatus === 'pending_wakasek') nextStatus = 'pending_kepsek';
      else if (role === 'kepsek' && currentStatus === 'pending_kepsek') nextStatus = 'approved';
      else {
        alert('Anda tidak memiliki wewenang untuk menyetujui tahap ini.');
        return;
      }
    }

    if (!confirm(`Apakah Anda yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} cuti ini?`)) return;

    try {
      const { error } = await supabase
        .from('leaves')
        .update({ status: nextStatus } as any)
        .eq('id', leaveId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      alert('Gagal mengubah status cuti');
      console.error(error);
    }
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find((t) => t.id === teacherId)?.name || 'Unknown';
  };

  const getLeaveDuration = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  };

  const canApprove = (status: Leave['status']) => {
    if (isAdmin) return status !== 'approved' && status !== 'rejected';
    if (role === 'hod' && status === 'pending_hod') return true;
    if (role === 'koordinator_hod' && status === 'pending_koor_hod') return true;
    if (role === 'wakasek' && status === 'pending_wakasek') return true;
    if (role === 'kepsek' && status === 'pending_kepsek') return true;
    return false;
  };

  const renderStatusBadge = (status: Leave['status']) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    let label = status;

    switch (status) {
      case 'pending':
      case 'pending_hod':
        bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; label = 'Menunggu HOD'; break;
      case 'pending_koor_hod':
        bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; label = 'Menunggu Koor HOD'; break;
      case 'pending_wakasek':
        bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; label = 'Menunggu Wakasek'; break;
      case 'pending_kepsek':
        bgColor = 'bg-purple-100'; textColor = 'text-purple-800'; label = 'Menunggu Kepsek'; break;
      case 'approved':
        bgColor = 'bg-green-100'; textColor = 'text-green-800'; label = 'Disetujui'; break;
      case 'rejected':
        bgColor = 'bg-red-100'; textColor = 'text-red-800'; label = 'Ditolak'; break;
    }

    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {label}
      </span>
    );
  };

  const handleExportExcel = () => {
    const exportData = displayLeaves.map((leave) => ({
      'Nama Guru': getTeacherName(leave.teacher_id),
      'Jenis Cuti': leave.leave_type,
      'Tanggal Mulai': format(parseISO(leave.start_date), 'dd MMMM yyyy', { locale: id }),
      'Tanggal Selesai': format(parseISO(leave.end_date), 'dd MMMM yyyy', { locale: id }),
      'Durasi': `${getLeaveDuration(leave.start_date, leave.end_date)} hari`,
      'Alasan': leave.reason,
      'Status': leave.status,
      'Tanggal Pengajuan': format(parseISO(leave.created_at), 'dd MMMM yyyy HH:mm', { locale: id }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Cuti');

    XLSX.writeFile(wb, `data-cuti-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {isManagement ? 'Manajemen Cuti' : 'Pengajuan Cuti'}
        </h2>
        <div className="flex w-full sm:w-auto space-x-2">
          {isAdmin && (
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm inline-flex"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingLeave(null);
              setFormData({
                teacher_id: currentTeacherId || '',
                leave_type: '',
                start_date: '',
                end_date: '',
                reason: '',
                status: role === 'hod' ? 'pending_koor_hod' : 'pending_hod',
              });
              setShowForm(true);
            }}
            className="flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm inline-flex"
          >
            <Plus className="w-5 h-5" />
            <span>{isManagement && !isAdmin ? 'Ajukan Cuti Pribadi' : isAdmin ? 'Tambah Cuti' : 'Ajukan Cuti'}</span>
          </button>
        </div>
      </div>

      {/* Responsive list/table for Leaves */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden">
          {displayLeaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada data pengajuan cuti.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayLeaves.map((leave) => (
                <div key={leave.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      {isManagement && (
                        <div className="font-semibold text-gray-900 mb-1">
                          {getTeacherName(leave.teacher_id)}
                        </div>
                      )}
                      <div className="text-sm font-medium text-blue-600">{leave.leave_type}</div>
                    </div>
                    {renderStatusBadge(leave.status)}
                  </div>
                  
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      {format(parseISO(leave.start_date), 'dd MMM yyyy', { locale: id })} -{' '}
                      {format(parseISO(leave.end_date), 'dd MMM yyyy', { locale: id })} 
                      <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {getLeaveDuration(leave.start_date, leave.end_date)} hari
                      </span>
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                    "{leave.reason}"
                  </div>

                  {/* Actions Mobile */}
                  <div className="flex justify-end pt-3 gap-2 border-t border-gray-50 mt-2">
                    {canApprove(leave.status) && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(leave.id, 'approve', leave.status)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" /> Setujui
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(leave.id, 'reject', leave.status)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Tolak
                        </button>
                      </>
                    )}
                    
                    {leave.teacher_id === currentTeacherId && (leave.status === 'pending_hod' || leave.status === 'pending_koor_hod' || leave.status === 'pending') && (
                      <button
                        onClick={() => handleEdit(leave)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    {(isAdmin || (leave.teacher_id === currentTeacherId && (leave.status === 'pending_hod' || leave.status === 'pending_koor_hod' || leave.status === 'pending'))) && (
                      <button
                        onClick={() => handleDelete(leave.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isManagement && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Guru
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Detail Cuti
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Periode & Durasi
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {displayLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-blue-50/50 transition-colors group">
                  {isManagement && (
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {getTeacherName(leave.teacher_id)}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-gray-900 mb-1">{leave.leave_type}</div>
                    <div className="text-sm text-gray-500 line-clamp-2 max-w-xs" title={leave.reason}>{leave.reason}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-gray-900 mb-1">
                      {format(parseISO(leave.start_date), 'dd MMM yyyy', { locale: id })} <ChevronRight className="w-3 h-3 inline text-gray-400 mx-1" /> {format(parseISO(leave.end_date), 'dd MMM yyyy', { locale: id })}
                    </div>
                    <div className="text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded-md">
                      {getLeaveDuration(leave.start_date, leave.end_date)} hari
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {renderStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                      {canApprove(leave.status) && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(leave.id, 'approve', leave.status)}
                            className="text-green-600 hover:text-green-900 hover:bg-green-50 p-2 rounded-full transition-colors tooltip"
                            title="Setujui"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(leave.id, 'reject', leave.status)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"
                            title="Tolak"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      
                      {leave.teacher_id === currentTeacherId && (leave.status === 'pending_hod' || leave.status === 'pending_koor_hod' || leave.status === 'pending') && (
                        <button
                          onClick={() => handleEdit(leave)}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-full transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      
                      {(isAdmin || (leave.teacher_id === currentTeacherId && (leave.status === 'pending_hod' || leave.status === 'pending_koor_hod' || leave.status === 'pending'))) && (
                        <button
                          onClick={() => handleDelete(leave.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayLeaves.length === 0 && (
                <tr>
                  <td colSpan={isManagement ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">Belum ada data cuti</p>
                      <p className="text-sm text-gray-500">Daftar pengajuan cuti akan tampil di sini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-100 px-6 py-5 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">
                {editingLeave ? 'Edit Cuti' : (isAdmin ? 'Tambah Cuti' : 'Ajukan Cuti')}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {isAdmin ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Guru
                  </label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_id: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                    required
                  >
                    <option value="">Pilih Guru</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start space-x-3 text-blue-800 shadow-sm">
                  <Clock className="w-5 h-5 mt-0.5 text-blue-500" />
                  <div>
                    <h4 className="text-sm font-semibold mb-0.5">Mengajukan cuti untuk:</h4>
                    <p className="text-sm font-medium text-blue-900">{getTeacherName(currentTeacherId || '')}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Jenis Cuti
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) =>
                    setFormData({ ...formData, leave_type: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                  required
                >
                  <option value="">Pilih Jenis Cuti</option>
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Cuti Sakit">Cuti Sakit</option>
                  <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                  <option value="Cuti Keperluan Pribadi">Cuti Keperluan Pribadi</option>
                  <option value="Cuti Penting">Cuti Penting</option>
                  <option value="Izin">Izin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mulai
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Selesai
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Alasan / Keterangan
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm resize-none"
                  placeholder="Jelaskan alasan cuti dengan singkat..."
                  required
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Status (Admin Override)
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Leave['status'],
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                    required
                  >
                    <option value="pending_hod">Menunggu HOD</option>
                    <option value="pending_koor_hod">Menunggu Koor HOD</option>
                    <option value="pending_wakasek">Menunggu Wakasek</option>
                    <option value="pending_kepsek">Menunggu Kepsek</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-sm flex items-center"
                >
                  {loading ? 'Menyimpan...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
