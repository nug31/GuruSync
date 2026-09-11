import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Teacher, Permission, PermissionType, PermissionStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionManagementProps {
  teachers: Teacher[];
  permissions: Permission[];
  onUpdate: () => void;
  currentTeacherId?: string;
}

// Types that require time fields
const TIME_BASED_TYPES: PermissionType[] = ['Terlambat', 'Izin Datang Terlambat', 'Pulang Cepat', 'Izin Keluar & Kembali'];
// Types that require Kepsek approval (full chain)
const KEPSEK_REQUIRED_TYPES: PermissionType[] = ['Cuti'];

const PERMISSION_TYPES: PermissionType[] = [
  'Sakit',
  'Cuti',
  'Tugas Luar',
  'Izin Keluar & Kembali',
  'Tidak Masuk',
  'Terlambat',
  'Izin Datang Terlambat',
  'Pulang Cepat',
];

const TYPE_ICONS: Record<PermissionType, string> = {
  'Sakit': 'medical_services',
  'Cuti': 'flight_takeoff',
  'Tugas Luar': 'work_history',
  'Izin Keluar & Kembali': 'transfer_within_a_station',
  'Tidak Masuk': 'person_off',
  'Terlambat': 'schedule',
  'Izin Datang Terlambat': 'login',
  'Pulang Cepat': 'logout',
};

const TYPE_COLORS: Record<PermissionType, string> = {
  'Sakit': 'text-error',
  'Cuti': 'text-primary',
  'Tugas Luar': 'text-tertiary',
  'Izin Keluar & Kembali': 'text-secondary',
  'Tidak Masuk': 'text-on-surface-variant',
  'Terlambat': 'text-error',
  'Izin Datang Terlambat': 'text-tertiary',
  'Pulang Cepat': 'text-secondary',
};

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

interface FormData {
  teacher_id: string;
  permission_type: PermissionType | '';
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  attachment_url: string;
  status: PermissionStatus;
}

const emptyForm = (currentTeacherId: string | undefined, initialStatus: PermissionStatus = 'pending_hod'): FormData => ({
  teacher_id: currentTeacherId || '',
  permission_type: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  reason: '',
  attachment_url: '',
  status: initialStatus,
});

export function PermissionManagement({ teachers, permissions, onUpdate, currentTeacherId }: PermissionManagementProps) {
  const { profile } = useAuth();

  const role = profile?.role || 'teacher';
  const isAdmin = role === 'admin';
  const isManagement = ['hod', 'koordinator_hod', 'wakasek', 'kepsek', 'admin'].includes(role);

  const initialStatus: PermissionStatus = role === 'hod' ? 'pending_wakasek' : 'pending_hod';

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<PermissionType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm(currentTeacherId, initialStatus));
  const [loading, setLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<Permission | null>(null);

  // Filtered display
  const displayPermissions = (isManagement
    ? permissions
    : permissions.filter(p => p.teacher_id === currentTeacherId)
  ).filter(p => {
    const matchTab =
      activeTab === 'all' ? true :
      activeTab === 'pending' ? p.status.startsWith('pending') :
      p.status === activeTab;
    const matchType = typeFilter === 'all' || p.permission_type === typeFilter;
    return matchTab && matchType;
  });

  const isTimeBased = (type: PermissionType | '') => TIME_BASED_TYPES.includes(type as PermissionType);
  const needsKepsek = (type: PermissionType | '') => KEPSEK_REQUIRED_TYPES.includes(type as PermissionType);

  // --- Helpers ---
  const getTeacherName = (teacherId: string) =>
    teachers.find(t => t.id === teacherId)?.name || 'Unknown';

  const getDuration = (start: string, end: string) =>
    differenceInDays(parseISO(end), parseISO(start)) + 1;

  const getStatusLabel = (status: PermissionStatus) => {
    switch (status) {
      case 'pending_hod': return 'Menunggu HOD';
      case 'pending_wakasek': return 'Menunggu Wakasek';
      case 'pending_kepsek': return 'Menunggu Kepsek';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
    }
  };

  const getStatusPillClasses = (status: PermissionStatus) => {
    const base = 'px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-[0.1em] font-bold whitespace-nowrap';
    if (status.startsWith('pending')) return `${base} bg-tertiary-fixed text-on-tertiary-fixed`;
    if (status === 'approved') return `${base} bg-primary-fixed text-on-primary-fixed`;
    return `${base} bg-error-container text-on-error-container`;
  };

  const canApprove = (permission: Permission): boolean => {
    if (isAdmin) return !['approved', 'rejected'].includes(permission.status);
    if (role === 'hod' || role === 'koordinator_hod') return permission.status === 'pending_hod';
    if (role === 'wakasek') return permission.status === 'pending_wakasek';
    if (role === 'kepsek') return permission.status === 'pending_kepsek';
    return false;
  };

  const getApprovalSteps = (permission: Permission) => {
    const type = permission.permission_type;
    if (KEPSEK_REQUIRED_TYPES.includes(type)) {
      return ['HOD/MGMP', 'Wakasek', 'Kepsek'];
    }
    return ['HOD/MGMP', 'Wakasek'];
  };

  const getCompletedSteps = (status: PermissionStatus) => {
    switch (status) {
      case 'pending_hod': return 0;
      case 'pending_wakasek': return 1;
      case 'pending_kepsek': return 2;
      case 'approved': return 99; // all done
      case 'rejected': return -1;
      default: return 0;
    }
  };

  // --- Actions ---
  const handleOpenForm = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        teacher_id: permission.teacher_id,
        permission_type: permission.permission_type,
        start_date: permission.start_date,
        end_date: permission.end_date,
        start_time: permission.start_time || '',
        end_time: permission.end_time || '',
        reason: permission.reason,
        attachment_url: permission.attachment_url || '',
        status: permission.status,
      });
    } else {
      setEditingPermission(null);
      setFormData(emptyForm(currentTeacherId, initialStatus));
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.permission_type) return;
    setLoading(true);

    try {
      const teacherId = isAdmin ? formData.teacher_id : currentTeacherId;
      if (!teacherId) {
        alert('Gagal: ID Guru tidak ditemukan.');
        return;
      }

      const payload = {
        teacher_id: teacherId,
        permission_type: formData.permission_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: isTimeBased(formData.permission_type) && formData.start_time ? formData.start_time : null,
        end_time: isTimeBased(formData.permission_type) && formData.end_time ? formData.end_time : null,
        reason: formData.reason,
        attachment_url: formData.attachment_url || null,
        status: isAdmin ? formData.status : (editingPermission ? formData.status : initialStatus),
      };

      if (editingPermission) {
        const { error } = await (supabase.from('permissions') as any).update(payload).eq('id', editingPermission.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('permissions') as any).insert([payload]);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingPermission(null);
      setFormData(emptyForm(currentTeacherId, initialStatus));
      onUpdate();
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error?.message || 'Unknown error'}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (permission: Permission) => {
    if (!confirm(`Setujui izin ${permission.permission_type} ini?`)) return;

    let nextStatus: PermissionStatus;
    if (isAdmin) {
      nextStatus = 'approved';
    } else if ((role === 'hod' || role === 'koordinator_hod') && permission.status === 'pending_hod') {
      nextStatus = 'pending_wakasek';
    } else if (role === 'wakasek' && permission.status === 'pending_wakasek') {
      nextStatus = needsKepsek(permission.permission_type) ? 'pending_kepsek' : 'approved';
    } else if (role === 'kepsek' && permission.status === 'pending_kepsek') {
      nextStatus = 'approved';
    } else {
      alert('Anda tidak memiliki wewenang untuk tahap ini.');
      return;
    }

    try {
      const { error } = await (supabase.from('permissions') as any)
        .update({ status: nextStatus, rejection_note: null })
        .eq('id', permission.id);
      if (error) throw error;
      setSelectedPermission(null);
      onUpdate();
    } catch (error: any) {
      alert(`Gagal menyetujui: ${error?.message}`);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    try {
      const { error } = await (supabase.from('permissions') as any)
        .update({ status: 'rejected', rejection_note: rejectionNote })
        .eq('id', showRejectModal.id);
      if (error) throw error;
      setShowRejectModal(null);
      setRejectionNote('');
      setSelectedPermission(null);
      onUpdate();
    } catch (error: any) {
      alert(`Gagal menolak: ${error?.message}`);
    }
  };

  const handleDelete = async (permissionId: string) => {
    if (!confirm('Hapus pengajuan izin ini?')) return;
    try {
      const { error } = await supabase.from('permissions').delete().eq('id', permissionId);
      if (error) throw error;
      setSelectedPermission(null);
      onUpdate();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error?.message}`);
    }
  };

  const pendingCount = displayPermissions.filter(p => p.status.startsWith('pending')).length;
  const approvedCount = displayPermissions.filter(p => p.status === 'approved').length;
  const rejectedCount = displayPermissions.filter(p => p.status === 'rejected').length;

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-outline-variant/30 pb-8">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant/70 font-label text-[10px] mb-4">
            <span>Guru</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Izin & Ketidakhadiran</span>
          </nav>
          <h1 className="text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">
            {isManagement ? 'Manajemen Pengajuan Izin' : 'Pengajuan Izin'}
          </h1>
          <p className="text-lg text-on-surface-variant/80 italic font-headline">
            Kelola pengajuan izin, tugas luar, dan ketidakhadiran dengan alur persetujuan berlevel.
          </p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl font-bold text-on-primary hover:brightness-95 transition-all text-sm shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {isManagement && !isAdmin ? 'Ajukan Izin Pribadi' : isAdmin ? 'Tambah Izin' : 'Ajukan Izin'}
        </button>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total', value: permissions.filter(p => isManagement || p.teacher_id === currentTeacherId).length, icon: 'assignment', color: 'text-on-surface', bg: 'bg-surface-container' },
          { label: 'Menunggu', value: pendingCount, icon: 'pending_actions', color: 'text-tertiary', bg: 'bg-tertiary-fixed/20' },
          { label: 'Disetujui', value: approvedCount, icon: 'task_alt', color: 'text-primary', bg: 'bg-primary-fixed/20' },
          { label: 'Ditolak', value: rejectedCount, icon: 'cancel', color: 'text-error', bg: 'bg-error-container/30' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all">
            <p className="text-on-surface-variant/60 font-label text-[10px] uppercase tracking-widest mb-3">{stat.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-headline font-bold text-on-surface">
                {String(stat.value).padStart(2, '0')}
              </span>
              <div className={`w-9 h-9 rounded-full ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Type Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {([
            { key: 'all', label: 'Semua' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'approved', label: 'Disetujui' },
            { key: 'rejected', label: 'Ditolak' },
          ] as { key: FilterTab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as PermissionType | 'all')}
          className="bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant/20 text-sm text-on-surface font-medium focus:ring-primary focus:border-primary w-full sm:w-auto"
        >
          <option value="all">Semua Jenis</option>
          {PERMISSION_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Permission Cards */}
      <div className="flex flex-col gap-3">
        {displayPermissions.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant/60 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
            <span className="material-symbols-outlined text-4xl mb-3 block">inbox</span>
            <p className="font-serif italic text-lg">Tidak ada pengajuan izin.</p>
          </div>
        ) : (
          displayPermissions.map(perm => {
            const teacher = teachers.find(t => t.id === perm.teacher_id);
            const steps = getApprovalSteps(perm);
            const completedSteps = getCompletedSteps(perm.status);
            const isPending = perm.status.startsWith('pending');
            const canEdit = perm.teacher_id === currentTeacherId && perm.status === 'pending_hod';

            return (
              <div
                key={perm.id}
                onClick={() => setSelectedPermission(perm.id === selectedPermission?.id ? null : perm)}
                className={`bg-surface-container-lowest rounded-2xl border transition-all cursor-pointer group ${
                  selectedPermission?.id === perm.id
                    ? 'border-primary/50 shadow-lg shadow-primary/5'
                    : 'border-outline-variant/20 hover:border-primary/30 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Main Row */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Teacher Info */}
                  <div className="lg:col-span-4 flex items-center gap-3">
                    {teacher?.avatar_url ? (
                      <img className="w-12 h-12 rounded-full object-cover border-2 border-surface-container-high shrink-0" src={teacher.avatar_url} alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border-2 border-surface-container-high shrink-0 text-on-surface-variant">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-headline font-bold text-on-surface truncate">{teacher?.name || 'Unknown'}</h4>
                      <p className="text-xs text-on-surface-variant italic truncate">{teacher?.subject || '-'}</p>
                    </div>
                  </div>

                  {/* Permission Type */}
                  <div className="lg:col-span-2">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 block mb-1">Jenis Izin</span>
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] ${TYPE_COLORS[perm.permission_type]}`}>
                        {TYPE_ICONS[perm.permission_type]}
                      </span>
                      <span className="truncate">{perm.permission_type}</span>
                    </span>
                  </div>

                  {/* Date/Time */}
                  <div className="lg:col-span-2">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 block mb-1">
                      {isTimeBased(perm.permission_type) ? 'Waktu' : 'Tanggal'}
                    </span>
                    {isTimeBased(perm.permission_type) && perm.start_time ? (
                      <>
                        <p className="text-sm font-bold">
                          {format(parseISO(perm.start_date), 'dd MMM yyyy', { locale: id })}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {perm.start_time}{perm.end_time ? ` – ${perm.end_time}` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold">
                          {format(parseISO(perm.start_date), 'dd MMM', { locale: id })} – {format(parseISO(perm.end_date), 'dd MMM yyyy', { locale: id })}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {getDuration(perm.start_date, perm.end_date)} Hari
                        </p>
                      </>
                    )}
                  </div>

                  {/* Status */}
                  <div className="lg:col-span-2 flex items-center">
                    <span className={getStatusPillClasses(perm.status)}>
                      {getStatusLabel(perm.status)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                    {canApprove(perm) && (
                      <>
                        <button
                          onClick={() => handleApprove(perm)}
                          className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
                          title="Setujui"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => { setShowRejectModal(perm); setRejectionNote(''); }}
                          className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-all"
                          title="Tolak"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleOpenForm(perm)}
                        className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
                    {(isAdmin || canEdit) && (
                      <button
                        onClick={() => handleDelete(perm.id)}
                        className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-all"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                    <span className={`material-symbols-outlined text-on-surface-variant/40 transition-transform ${selectedPermission?.id === perm.id ? 'rotate-90' : ''}`}>
                      chevron_right
                    </span>
                  </div>
                </div>

                {/* Expanded Detail + Approval Progress */}
                {selectedPermission?.id === perm.id && (
                  <div className="px-5 pb-5 border-t border-outline-variant/20 pt-5" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left: Detail */}
                      <div className="space-y-5">
                        <div>
                          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Alasan</p>
                          <div className="relative">
                            <span className="absolute -top-3 -left-1 text-5xl text-primary/10 font-serif">"</span>
                            <p className="font-headline italic text-on-surface leading-relaxed relative z-10 px-5 py-3 bg-surface-container-low rounded-xl border-l-4 border-primary/20">
                              {perm.reason}
                            </p>
                          </div>
                        </div>
                        {perm.rejection_note && (
                          <div className="bg-error-container/30 rounded-xl p-4 border border-error/20">
                            <p className="text-[10px] font-label uppercase tracking-widest text-error/70 mb-1 font-bold">Catatan Penolakan</p>
                            <p className="text-sm text-on-surface">{perm.rejection_note}</p>
                          </div>
                        )}
                        {perm.attachment_url && (
                          <div>
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Lampiran</p>
                            <a href={perm.attachment_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary font-bold hover:underline text-sm"
                            >
                              <span className="material-symbols-outlined text-[18px]">description</span>
                              Lihat Lampiran
                            </a>
                          </div>
                        )}
                        <div className="text-[10px] text-on-surface-variant/50 font-label">
                          Diajukan: {format(parseISO(perm.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                        </div>
                      </div>

                      {/* Right: Approval Progress */}
                      <div>
                        <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-4 font-bold">
                          Alur Persetujuan {needsKepsek(perm.permission_type) ? '(sampai Kepsek)' : '(sampai Wakasek)'}
                        </p>
                        <div className="flex flex-col gap-3">
                          {/* Submitter */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-on-primary text-[16px]">person</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-on-surface">Guru</p>
                              <p className="text-[11px] text-on-surface-variant">Pengaju</p>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                          </div>

                          {steps.map((step, idx) => {
                            const done = perm.status === 'rejected' ? false : completedSteps > idx;
                            const isCurrent = !done && !perm.status.includes('approved') && !perm.status.includes('rejected') && (
                              (idx === 0 && perm.status === 'pending_hod') ||
                              (idx === 1 && perm.status === 'pending_wakasek') ||
                              (idx === 2 && perm.status === 'pending_kepsek')
                            );
                            const rejected = perm.status === 'rejected' && isCurrent;

                            return (
                              <div key={step}>
                                {/* Connector line */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="ml-4 w-px h-3 bg-outline-variant/40" />
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    done ? 'bg-primary' :
                                    isCurrent ? 'bg-tertiary-fixed border-2 border-tertiary' :
                                    'bg-surface-container border-2 border-outline-variant/30'
                                  }`}>
                                    <span className={`material-symbols-outlined text-[16px] ${
                                      done ? 'text-on-primary' :
                                      isCurrent ? 'text-on-tertiary-fixed' :
                                      'text-on-surface-variant/40'
                                    }`}>
                                      {done ? 'check' : isCurrent ? 'pending' : 'radio_button_unchecked'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-sm font-bold ${done || isCurrent ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                                      {step}
                                    </p>
                                    <p className="text-[11px] text-on-surface-variant">
                                      {done ? 'Telah disetujui' : isCurrent ? 'Menunggu persetujuan' : 'Belum giliran'}
                                    </p>
                                  </div>
                                  {done && <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>}
                                  {isCurrent && !rejected && <span className="material-symbols-outlined text-[18px] text-tertiary animate-pulse">schedule</span>}
                                </div>
                              </div>
                            );
                          })}

                          {/* Final status */}
                          <div className="flex items-center gap-3">
                            <div className="ml-4 w-px h-3 bg-outline-variant/40" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              perm.status === 'approved' ? 'bg-primary' :
                              perm.status === 'rejected' ? 'bg-error' :
                              'bg-surface-container border-2 border-outline-variant/30'
                            }`}>
                              <span className={`material-symbols-outlined text-[16px] ${
                                perm.status === 'approved' ? 'text-on-primary' :
                                perm.status === 'rejected' ? 'text-on-error' :
                                'text-on-surface-variant/40'
                              }`}>
                                {perm.status === 'approved' ? 'task_alt' : perm.status === 'rejected' ? 'cancel' : 'flag'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${
                                perm.status === 'approved' ? 'text-primary' :
                                perm.status === 'rejected' ? 'text-error' :
                                'text-on-surface-variant/50'
                              }`}>
                                {perm.status === 'approved' ? 'Disetujui' : perm.status === 'rejected' ? 'Ditolak' : 'Final'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Inline approve/reject for management */}
                        {canApprove(perm) && (
                          <div className="mt-6 flex gap-3">
                            <button
                              onClick={() => handleApprove(perm)}
                              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-95 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              Setujui
                            </button>
                            <button
                              onClick={() => { setShowRejectModal(perm); setRejectionNote(''); }}
                              className="flex-1 py-3 rounded-xl border border-error/30 text-error font-bold hover:bg-error/5 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-2xl relative overflow-hidden max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="h-2 bg-primary" />
            <div className="p-5 sm:p-8">
              <div className="flex items-start justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-outline-variant/20">
                <div>
                  <h4 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">
                    {editingPermission ? 'Edit Pengajuan Izin' : 'Formulir Pengajuan Izin'}
                  </h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant/70 mt-1">
                    Isi formulir dengan lengkap dan benar
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Teacher Selector (admin only) */}
                {isAdmin ? (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Guru</label>
                    <select
                      value={formData.teacher_id}
                      onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
                      required
                    >
                      <option value="">Pilih Guru</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 font-bold">Mengajukan izin untuk:</p>
                    <p className="text-base font-headline font-bold text-primary">{getTeacherName(currentTeacherId || '')}</p>
                  </div>
                )}

                {/* Jenis Izin */}
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Jenis Izin</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PERMISSION_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, permission_type: type })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.permission_type === type
                            ? 'bg-primary text-on-primary border-primary shadow-sm'
                            : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{TYPE_ICONS[type]}</span>
                        <span className="text-center leading-tight">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Approval hint */}
                {formData.permission_type && (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                    needsKepsek(formData.permission_type) ? 'bg-primary-fixed/20 text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>
                      Alur: Guru → HOD/MGMP → Wakasek
                      {needsKepsek(formData.permission_type) ? ' → Kepala Sekolah' : ''}
                    </span>
                  </div>
                )}

                {/* Tanggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Jam (hanya untuk tipe berbasis waktu) */}
                {isTimeBased(formData.permission_type) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                        {formData.permission_type === 'Pulang Cepat' ? 'Jam Pulang' : 'Jam Masuk / Mulai'}
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                        {formData.permission_type === 'Terlambat' || formData.permission_type === 'Izin Datang Terlambat'
                          ? 'Jam Tiba'
                          : 'Jam Kembali / Selesai'}
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Alasan */}
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Alasan / Keterangan</label>
                  <div className="relative">
                    <span className="absolute -top-3 -left-1 text-5xl text-primary/10 font-serif opacity-50">"</span>
                    <textarea
                      value={formData.reason}
                      onChange={e => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="w-full relative z-10 px-5 py-3 bg-surface-container-low rounded-xl border-l-4 border-primary/20 border-y-0 border-r-0 focus:ring-primary text-on-surface font-headline italic leading-relaxed resize-none text-base"
                      placeholder="Jelaskan alasan pengajuan secara rinci..."
                      required
                    />
                  </div>
                </div>

                {/* Status override (admin only) */}
                {isAdmin && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Status (Admin Override)</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as PermissionStatus })}
                      className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface font-bold text-sm"
                    >
                      <option value="pending_hod">Menunggu HOD</option>
                      <option value="pending_wakasek">Menunggu Wakasek</option>
                      <option value="pending_kepsek">Menunggu Kepsek</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 rounded-xl border border-error/30 text-error font-bold hover:bg-error/5 transition-all text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.permission_type || (!isAdmin && !currentTeacherId)}
                    className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {loading ? 'Menyimpan...' : 'Simpan Pengajuan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl p-8 max-w-md w-full">
            <h4 className="text-xl font-headline font-bold text-on-surface mb-2">Tolak Pengajuan</h4>
            <p className="text-sm text-on-surface-variant mb-6">
              Tolak izin <strong>{showRejectModal.permission_type}</strong> dari{' '}
              <strong>{getTeacherName(showRejectModal.teacher_id)}</strong>?
            </p>
            <div className="mb-6">
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                Catatan Penolakan <span className="text-on-surface-variant/40 normal-case">(opsional)</span>
              </label>
              <textarea
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-on-surface resize-none text-sm"
                placeholder="Jelaskan alasan penolakan..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-high transition-all text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold hover:brightness-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
