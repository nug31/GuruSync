import { useState } from 'react';
import { supabase } from '../../lib/supabase';
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
      
      const teacherId = isAdmin ? formData.teacher_id : currentTeacherId;
      
      if (!teacherId) {
        alert('Gagal: ID Guru tidak ditemukan. Pastikan profil Anda sudah terhubung dengan data guru.');
        setLoading(false);
        return;
      }

      const submissionData = isAdmin ? formData : {
        ...formData,
        teacher_id: teacherId,
        status: editingLeave ? formData.status : initialStatus as Leave['status']
      };

      if (editingLeave) {
        const { error } = await (supabase.from('leaves') as any)
          .update(submissionData)
          .eq('id', editingLeave.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase.from('leaves') as any)
          .insert([submissionData]);

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
      const { error } = await (supabase.from('leaves') as any)
        .update({ status: nextStatus })
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

  const getStatusLabel = (status: Leave['status']) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'pending_hod': return 'Menunggu HOD';
      case 'pending_koor_hod': return 'Menunggu Koor';
      case 'pending_wakasek': return 'Menunggu Wakasek';
      case 'pending_kepsek': return 'Menunggu Kepsek';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const getStatusPillClasses = (status: Leave['status']) => {
    if (status.startsWith('pending')) return 'bg-tertiary-fixed text-on-tertiary-fixed font-bold px-4 py-1.5 rounded-full text-[10px] font-label uppercase tracking-[0.1em] text-center';
    if (status === 'approved') return 'bg-primary-fixed text-on-primary-fixed font-bold px-4 py-1.5 rounded-full text-[10px] font-label uppercase tracking-[0.1em] text-center';
    return 'bg-error-container text-on-error-container font-bold px-4 py-1.5 rounded-full text-[10px] font-label uppercase tracking-[0.1em] text-center';
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

  const currentTeacher = teachers.find(t => t.id === currentTeacherId);
  const annualLeaveQuota = currentTeacher?.annual_leave_quota ?? 12;
  const currentYear = new Date().getFullYear();
  
  const usedAnnualLeaves = leaves
    .filter(l => 
      l.teacher_id === currentTeacherId && 
      l.leave_type === 'Cuti Tahunan' && 
      l.status === 'approved' &&
      new Date(l.start_date).getFullYear() === currentYear
    )
    .reduce((total, l) => total + getLeaveDuration(l.start_date, l.end_date), 0);
  
  const remainingAnnualLeaves = Math.max(0, annualLeaveQuota - usedAnnualLeaves);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-outline-variant/30 pb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">
            {isManagement ? 'Manajemen Pengajuan Cuti' : 'Pengajuan Cuti'}
          </h1>
          <p className="text-lg text-on-surface-variant/80 italic font-headline">Kelola dan tinjau semua permintaan izin dan cuti staf pengajar dengan presisi.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {isAdmin && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-6 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl font-bold text-primary hover:bg-primary/5 transition-all text-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Ekspor Laporan
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
            className="flex items-center gap-2 px-6 py-2.5 bg-primary rounded-xl font-bold text-on-primary hover:brightness-95 transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            {isManagement && !isAdmin ? 'Ajukan Cuti Pribadi' : isAdmin ? 'Tambah Cuti' : 'Ajukan Cuti'}
          </button>
        </div>
      </div>

      {/* Quota Summary for Current Teacher */}
      {currentTeacherId && (
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm mb-12 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
             <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Sisa Saldo Cuti</p>
             <div className="flex items-baseline gap-2 mb-3">
               <span className="text-4xl font-headline font-bold text-primary">{remainingAnnualLeaves.toString().padStart(2, '0')}</span>
               <span className="text-sm text-on-surface-variant font-medium">Hari</span>
               <span className="text-[11px] text-on-surface-variant italic ml-2">Dari {annualLeaveQuota} Hari / Tahun</span>
             </div>
             <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
               <div className="bg-primary h-full rounded-full" style={{ width: `${(remainingAnnualLeaves / annualLeaveQuota) * 100}%` }}></div>
             </div>
          </div>
          <div className="flex gap-8">
             <div>
               <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Cuti Terpakai</p>
               <p className="text-2xl font-headline font-bold text-on-surface">{usedAnnualLeaves.toString().padStart(2, '0')} Hari</p>
             </div>
          </div>
        </div>
      )}

      {/* Stats Bento */}
      {isManagement && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all">
            <p className="text-on-surface-variant/60 font-label text-[11px] uppercase tracking-widest mb-4">Menunggu</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {displayLeaves.filter(l => l.status.startsWith('pending')).length.toString().padStart(2, '0')}
              </span>
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all">
            <p className="text-on-surface-variant/60 font-label text-[11px] uppercase tracking-widest mb-4">Disetujui</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {displayLeaves.filter(l => l.status === 'approved').length.toString().padStart(2, '0')}
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">event_available</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all">
            <p className="text-on-surface-variant/60 font-label text-[11px] uppercase tracking-widest mb-4">Sedang Cuti</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {displayLeaves.filter(l => l.status === 'approved' && new Date(l.start_date) <= new Date() && new Date(l.end_date) >= new Date()).length.toString().padStart(2, '0')}
              </span>
              <div className="w-10 h-10 rounded-full bg-secondary-fixed/30 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">person_off</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all">
            <p className="text-on-surface-variant/60 font-label text-[11px] uppercase tracking-widest mb-4">Ditolak</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-headline font-bold text-on-surface">
                {displayLeaves.filter(l => l.status === 'rejected').length.toString().padStart(2, '0')}
              </span>
              <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center text-error">
                <span className="material-symbols-outlined">cancel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8 px-2 border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-2 -mb-[3px]">
            <span className="text-sm font-bold text-primary">Semua Pengajuan</span>
          </div>
        </div>
      </div>

      {/* Leave Request Table (Card Layout) */}
      <div className="flex flex-col gap-4">
        {displayLeaves.length === 0 ? (
           <div className="p-12 text-center text-on-surface-variant/60 shadow-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
             <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
             <p className="font-serif italic text-lg">Belum ada pengajuan cuti.</p>
           </div>
        ) : (
          displayLeaves.map(leave => {
            const teacher = teachers.find(t => t.id === leave.teacher_id);
            const isPending = leave.status.startsWith('pending');
            
            return (
              <div key={leave.id} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="col-span-4 flex items-center gap-4">
                    {teacher?.avatar_url ? (
                      <img className="w-14 h-14 rounded-full object-cover border-2 border-surface-container-high" src={teacher.avatar_url} alt="" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center border-2 border-surface-container-high text-on-surface-variant">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-headline font-bold text-on-surface text-lg">{teacher?.name || 'Unknown'}</h4>
                      <p className="text-sm text-on-surface-variant italic">{teacher?.subject || '-'}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant/60 block mb-1">Jenis Cuti</span>
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {leave.leave_type.includes('Sakit') ? 'medical_services' : 
                         leave.leave_type.includes('Tahunan') ? 'flight' : 'event_note'}
                      </span>
                      {leave.leave_type}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant/60 block mb-1">Durasi</span>
                    <p className="text-sm font-bold">{format(parseISO(leave.start_date), 'dd MMM', { locale: id })} - {format(parseISO(leave.end_date), 'dd MMM yyyy', { locale: id })}</p>
                    <p className="text-[11px] text-on-surface-variant">{getLeaveDuration(leave.start_date, leave.end_date)} Hari Kerja</p>
                  </div>
                  <div className="col-span-2 flex items-center lg:justify-center">
                    <span className={getStatusPillClasses(leave.status)}>
                      {getStatusLabel(leave.status)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {canApprove(leave.status) && (
                      <>
                        <button onClick={() => handleStatusUpdate(leave.id, 'approve', leave.status)} className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:shadow-lg transition-all" title="Setujui">
                          <span className="material-symbols-outlined text-[20px]">check</span>
                        </button>
                        <button onClick={() => handleStatusUpdate(leave.id, 'reject', leave.status)} className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-all" title="Tolak">
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </>
                    )}
                    {leave.teacher_id === currentTeacherId && isPending && (
                      <button onClick={() => handleEdit(leave)} className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all" title="Edit">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    )}
                    {(isAdmin || (leave.teacher_id === currentTeacherId && isPending)) && (
                      <button onClick={() => handleDelete(leave.id)} className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-all" title="Hapus">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal (Styled like Details Panel) */}
      {showForm && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-2xl relative overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="h-2 bg-primary"></div>
            <div className="p-10">
              <div className="absolute top-10 right-10">
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>

              <div className="mb-10 border-b border-outline-variant/30 pb-6 pr-8">
                <h4 className="text-2xl font-headline font-bold text-on-surface">
                  {editingLeave ? 'Detail & Edit Pengajuan Cuti' : (isAdmin ? 'Formulir Pengajuan Cuti (Admin)' : 'Formulir Pengajuan Cuti')}
                </h4>
                {editingLeave && (
                  <div className="mt-4">
                     <span className={getStatusPillClasses(formData.status)}>{getStatusLabel(formData.status)}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {isAdmin ? (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Guru
                    </label>
                    <select
                      value={formData.teacher_id}
                      onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
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
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20">
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Mengajukan cuti untuk:</p>
                    <p className="text-lg font-headline font-bold text-primary">{getTeacherName(currentTeacherId || '')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Jenis Cuti
                    </label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
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

                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-4 font-bold block">
                    Alasan / Keterangan Lengkap
                  </label>
                  <div className="relative">
                    <span className="absolute -top-4 -left-2 text-6xl text-primary/10 font-serif opacity-50">“</span>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={4}
                      className="w-full relative z-10 px-6 py-4 bg-surface-container-low rounded-2xl border-l-4 border-primary/20 border-y-0 border-r-0 focus:ring-primary text-on-surface font-headline italic leading-relaxed resize-none text-lg"
                      placeholder="Jelaskan alasan pengajuan secara rinci..."
                      required
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Status (Admin Override)
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Leave['status'] })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
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

                <div className="flex flex-wrap justify-end gap-4 pt-8 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-8 py-3 rounded-xl border border-error/30 text-error font-bold hover:bg-error/5 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!isAdmin && !currentTeacherId)}
                    className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    {loading ? 'Menyimpan...' : 'Simpan Pengajuan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
