import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import type { Teacher, Permission, PermissionType, PermissionStatus, Campus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionManagementProps {
  teachers: Teacher[];
  permissions: Permission[];
  onUpdate: () => void;
  currentTeacherId?: string;
}

// Types that require time fields
const TIME_BASED_TYPES: PermissionType[] = ['Terlambat', 'Pulang Cepat', 'Izin Keluar & Kembali', 'Tugas Luar'];
// Types that require Kepsek approval (full chain)
const KEPSEK_REQUIRED_TYPES: PermissionType[] = ['Cuti'];

const PERMISSION_TYPES: PermissionType[] = [
  'Sakit',
  'Cuti',
  'Tugas Luar',
  'Izin Keluar & Kembali',
  'Tidak Masuk',
  'Terlambat',
  'Pulang Cepat',
];

const TYPE_ICONS: Record<PermissionType, string> = {
  'Sakit': 'medical_services',
  'Cuti': 'flight_takeoff',
  'Tugas Luar': 'work_history',
  'Izin Keluar & Kembali': 'transfer_within_a_station',
  'Tidak Masuk': 'person_off',
  'Terlambat': 'schedule',
  'Pulang Cepat': 'logout',
};

const TYPE_COLORS: Record<PermissionType, string> = {
  'Sakit': 'text-error',
  'Cuti': 'text-primary',
  'Tugas Luar': 'text-tertiary',
  'Izin Keluar & Kembali': 'text-secondary',
  'Tidak Masuk': 'text-on-surface-variant',
  'Terlambat': 'text-error',
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
  tugas_luar_kampus: Campus | '';
  tujuan_tugas_luar: string;
  guru_pengganti_id: string;
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
  tugas_luar_kampus: '',
  tujuan_tugas_luar: '',
  guru_pengganti_id: '',
});

export function PermissionManagement({ teachers, permissions, onUpdate, currentTeacherId }: PermissionManagementProps) {
  const { profile } = useAuth();

  const role = profile?.role || 'teacher';
  const isAdmin = role === 'admin';
  const isManagement = ['hod', 'koordinator_hod', 'wakasek', 'kepsek', 'admin'].includes(role);
  const myCampus: Campus = teachers.find(t => t.id === currentTeacherId)?.campus || 'utama';
  const isTugasLuarApprover = teachers.find(t => t.id === currentTeacherId)?.tugas_luar_approver === true;

  // Always start at pending_hod — the "Teachers can insert own permissions" RLS policy
  // requires status = 'pending_hod' on insert. A HOD approves their own pending_hod
  // request like any other (canApprove has no self-exclusion), which advances it normally.
  const initialStatus: PermissionStatus = 'pending_hod';

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<PermissionType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm(currentTeacherId, initialStatus));
  const [loading, setLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<Permission | null>(null);

  // Buka & sorot pengajuan tertentu kalau dibuka lewat link notifikasi WA (?izin=<id>)
  useEffect(() => {
    const targetId = new URLSearchParams(window.location.search).get('izin');
    if (targetId) {
      const match = permissions.find(p => p.id === targetId);
      if (match) setSelectedPermission(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

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

  // Guru normatif-adaptif langsung ke Wakasek (tanpa tahap HOD/MGMP)
  const isNormatif = (teacherId: string) =>
    teachers.find(t => t.id === teacherId)?.subject_category === 'normatif_adaptif';

  const getInitialStatus = (teacherId: string): PermissionStatus =>
    isNormatif(teacherId) ? 'pending_wakasek' : 'pending_hod';

  // Tugas Luar yang ditandai dari Kampus 03 lewati HOD & Wakasek, langsung ke Kepsek Kampus 03
  const isKampus03FastTrack = (permission: Permission) =>
    permission.permission_type === 'Tugas Luar' && permission.tugas_luar_kampus === 'kampus_03';

  // Status tahap pertama = satu-satunya status di mana guru masih boleh edit/hapus pengajuannya
  const getFirstStageStatus = (permission: Permission): PermissionStatus | null =>
    isKampus03FastTrack(permission) ? null : getInitialStatus(permission.teacher_id);

  const getStatusLabel = (permission: Permission) => {
    switch (permission.status) {
      case 'pending_hod': return 'Menunggu HOD';
      case 'pending_wakasek': return 'Menunggu Wakasek';
      case 'pending_kepsek': return isKampus03FastTrack(permission) ? 'Menunggu Kepsek Kampus 03' : 'Menunggu Kepsek';
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
    if (permission.status === 'pending_hod') {
      return role === 'hod' && !isNormatif(permission.teacher_id);
    }
    if (permission.status === 'pending_kepsek') {
      if (role !== 'kepsek') return false;
      const requiredCampus: Campus = isKampus03FastTrack(permission) ? 'kampus_03' : 'utama';
      return myCampus === requiredCampus;
    }
    if (role === 'wakasek' && permission.status === 'pending_wakasek') {
      if (permission.permission_type === 'Tugas Luar') return isTugasLuarApprover;
      return true;
    }
    return false;
  };

  // --- Notifikasi WhatsApp ke approver ---
  const normalizePhone = (raw: string) => {
    let p = raw.replace(/[^0-9+]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (!p.startsWith('62')) p = '62' + p;
    return p;
  };

  const getEligibleApprovers = (permission: Permission): Teacher[] => {
    if (permission.status === 'pending_hod') {
      return teachers.filter(t => t.app_role === 'hod' && (t.wa_number || t.phone));
    }
    if (permission.status === 'pending_wakasek') {
      return teachers.filter(t =>
        t.app_role === 'wakasek' && (t.wa_number || t.phone) &&
        (permission.permission_type !== 'Tugas Luar' || t.tugas_luar_approver === true)
      );
    }
    if (permission.status === 'pending_kepsek') {
      const requiredCampus: Campus = isKampus03FastTrack(permission) ? 'kampus_03' : 'utama';
      return teachers.filter(t => t.app_role === 'kepsek' && t.campus === requiredCampus && (t.wa_number || t.phone));
    }
    return [];
  };

  const buildWaLink = (permission: Permission, approver: Teacher) => {
    const teacher = teachers.find(t => t.id === permission.teacher_id);
    const periode = permission.start_date === permission.end_date
      ? format(parseISO(permission.start_date), 'd MMMM yyyy', { locale: id })
      : `${format(parseISO(permission.start_date), 'd MMM yyyy', { locale: id })} - ${format(parseISO(permission.end_date), 'd MMM yyyy', { locale: id })}`;
    const link = `${window.location.origin}/?izin=${permission.id}`;

    const lines = [
      `*PENGAJUAN IZIN BARU - GuruSync*`,
      ``,
      `Jenis Izin: *${permission.permission_type}*`,
      `Pemohon: *${teacher?.name || '-'}*`,
      `Mapel/Unit: ${teacher?.subject || '-'}`,
      `Tanggal: ${periode}`,
    ];
    if (isTimeBased(permission.permission_type) && (permission.start_time || permission.end_time)) {
      lines.push(`Jam: ${(permission.start_time || '--:--').slice(0, 5)} - ${(permission.end_time || '--:--').slice(0, 5)}`);
    }
    lines.push(`Alasan: ${permission.reason}`);
    if (permission.permission_type === 'Tugas Luar' && permission.tujuan_tugas_luar) {
      lines.push(`Tujuan: ${permission.tujuan_tugas_luar}`);
    }
    lines.push(
      ``,
      `Mohon Bapak/Ibu ${approver.name} berkenan meninjau dan memberikan persetujuan melalui link berikut:`,
      ``,
      link,
    );

    const phone = normalizePhone(approver.wa_number || approver.phone);
    // wa.me adalah format resmi WhatsApp untuk deep-link langsung ke chat nomor
    // tertentu (web.whatsapp.com/send bukan endpoint resmi dan hanya membuka
    // beranda WA Web tanpa membuka chat yang dituju).
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const getApprovalSteps = (permission: Permission) => {
    const type = permission.permission_type;
    if (isKampus03FastTrack(permission)) {
      return ['Kepsek Kampus 03'];
    }
    const needsK = KEPSEK_REQUIRED_TYPES.includes(type);
    if (isNormatif(permission.teacher_id)) {
      return needsK ? ['Wakasek', 'Kepsek'] : ['Wakasek'];
    }
    return needsK ? ['HOD', 'Wakasek', 'Kepsek'] : ['HOD', 'Wakasek'];
  };

  const getCompletedSteps = (permission: Permission) => {
    if (isKampus03FastTrack(permission)) {
      switch (permission.status) {
        case 'pending_kepsek': return 0;
        case 'approved': return 99;
        case 'rejected': return -1;
        default: return 0;
      }
    }
    if (isNormatif(permission.teacher_id)) {
      switch (permission.status) {
        case 'pending_kepsek': return 1;
        case 'approved': return 99;
        case 'rejected': return -1;
        default: return 0;
      }
    }
    switch (permission.status) {
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
        tugas_luar_kampus: permission.tugas_luar_kampus || '',
        tujuan_tugas_luar: permission.tujuan_tugas_luar || '',
        guru_pengganti_id: permission.guru_pengganti_id || '',
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

      const isNewFastTrack = !editingPermission && !isAdmin
        && formData.permission_type === 'Tugas Luar' && formData.tugas_luar_kampus === 'kampus_03';

      const payload = {
        teacher_id: teacherId,
        permission_type: formData.permission_type,
        start_date: formData.start_date,
        end_date: formData.end_date || formData.start_date,
        start_time: isTimeBased(formData.permission_type) && formData.start_time ? formData.start_time : null,
        end_time: isTimeBased(formData.permission_type) && formData.end_time ? formData.end_time : null,
        reason: formData.reason,
        attachment_url: formData.attachment_url || null,
        status: isAdmin ? (!editingPermission && formData.status === 'pending_hod' ? getInitialStatus(teacherId) : formData.status) : (editingPermission ? formData.status : (isNewFastTrack ? 'pending_kepsek' : getInitialStatus(teacherId))),
        tugas_luar_kampus: formData.permission_type === 'Tugas Luar' && formData.tugas_luar_kampus ? formData.tugas_luar_kampus : null,
        tujuan_tugas_luar: formData.permission_type === 'Tugas Luar' && formData.tujuan_tugas_luar ? formData.tujuan_tugas_luar : null,
        guru_pengganti_id: formData.permission_type === 'Cuti' && formData.guru_pengganti_id ? formData.guru_pengganti_id : null,
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
    } else if (permission.status === 'pending_hod' && canApprove(permission)) {
      nextStatus = 'pending_wakasek';
    } else if (permission.status === 'pending_wakasek' && canApprove(permission)) {
      nextStatus = needsKepsek(permission.permission_type) ? 'pending_kepsek' : 'approved';
    } else if (permission.status === 'pending_kepsek' && canApprove(permission)) {
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

  // --- Cetak Surat Cuti (hanya untuk Cuti yang sudah Disetujui) ---
  const handlePrintCuti = (perm: Permission) => {
    const teacher = teachers.find(t => t.id === perm.teacher_id);
    const pengganti = perm.guru_pengganti_id ? teachers.find(t => t.id === perm.guru_pengganti_id) : null;
    const lama = differenceInDays(parseISO(perm.end_date), parseISO(perm.start_date)) + 1;
    const nomor = `SC-${format(parseISO(perm.created_at), 'yyyyMMdd')}-${perm.id.slice(0, 6).toUpperCase()}`;

    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Surat Izin Cuti - ${teacher?.name || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #0f172a; max-width: 720px; margin: 40px auto; line-height: 1.6; }
  .kop { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  .kop h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
  .kop p { margin: 2px 0; font-size: 13px; }
  h2 { text-align: center; text-decoration: underline; margin: 24px 0 4px; font-size: 16px; }
  .nomor { text-align: center; font-size: 13px; margin-bottom: 24px; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.data td { padding: 4px 8px; vertical-align: top; font-size: 14px; }
  table.data td:first-child { width: 180px; }
  .ttd { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; font-size: 14px; }
  .ttd div { width: 30%; }
  .ttd .line { margin-top: 70px; border-top: 1px solid #0f172a; padding-top: 4px; }
  @media print { body { margin: 0 24px; } }
</style></head>
<body>
  <div class="kop">
    <h1>SMK MITRA INDUSTRI</h1>
    <p>Portal Kepegawaian &amp; Administrasi Guru — GuruSync</p>
  </div>
  <h2>SURAT IZIN CUTI</h2>
  <p class="nomor">Nomor: ${nomor}</p>
  <table class="data">
    <tr><td>Nama</td><td>: ${teacher?.name || '-'}</td></tr>
    <tr><td>NIK</td><td>: ${teacher?.nik || '-'}</td></tr>
    <tr><td>Mapel / Unit</td><td>: ${teacher?.subject || '-'}</td></tr>
    <tr><td>Unit Kerja</td><td>: ${teacher?.work_unit || '-'}</td></tr>
    <tr><td>Jenis Izin</td><td>: Cuti</td></tr>
    <tr><td>Tanggal Cuti</td><td>: ${format(parseISO(perm.start_date), 'd MMMM yyyy', { locale: id })} s.d. ${format(parseISO(perm.end_date), 'd MMMM yyyy', { locale: id })} (${lama} hari)</td></tr>
    <tr><td>Alasan</td><td>: ${perm.reason}</td></tr>
    <tr><td>Guru Pengganti</td><td>: ${pengganti ? `${pengganti.name} (${pengganti.subject})` : '-'}</td></tr>
    <tr><td>Status</td><td>: Disetujui</td></tr>
  </table>
  <p>Surat ini menyatakan bahwa pengajuan cuti di atas telah disetujui melalui alur persetujuan berjenjang pada sistem GuruSync dan sah digunakan sebagai bukti administrasi kepegawaian.</p>
  <div class="ttd">
    <div><div class="line">Guru Pemohon<br/>${teacher?.name || ''}</div></div>
    <div><div class="line">Wakasek</div></div>
    <div><div class="line">Kepala Sekolah</div></div>
  </div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir browser.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // --- Rekap Excel (Admin): harian, mingguan, bulanan, per jenis izin ---
  const handleExportRekap = () => {
    const approved = permissions.filter(p => p.status === 'approved');

    // 1. Pecah tiap pengajuan ke setiap tanggal aktifnya -> hitung per hari per jenis
    const dailyMap: Record<string, Partial<Record<PermissionType, number>>> = {};
    approved.forEach(p => {
      let d = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      let guard = 0;
      while (d <= end && guard < 366) {
        const key = format(d, 'yyyy-MM-dd');
        if (!dailyMap[key]) dailyMap[key] = {};
        dailyMap[key][p.permission_type] = (dailyMap[key][p.permission_type] || 0) + 1;
        d = addDays(d, 1);
        guard++;
      }
    });
    const dayKeys = Object.keys(dailyMap).sort();

    const rowFor = (counts: Partial<Record<PermissionType, number>>) => {
      const row: Record<string, string | number> = {};
      let total = 0;
      PERMISSION_TYPES.forEach(t => {
        const c = counts[t] || 0;
        row[t] = c;
        total += c;
      });
      row['Total'] = total;
      return row;
    };

    const dailyRows = dayKeys.map(key => ({
      'Tanggal': format(parseISO(key), 'EEEE, d MMMM yyyy', { locale: id }),
      ...rowFor(dailyMap[key]),
    }));

    // 2. Kelompokkan hari ke minggu (Senin - Minggu)
    const weeklyMap: Record<string, { label: string; counts: Partial<Record<PermissionType, number>> }> = {};
    dayKeys.forEach(key => {
      const d = parseISO(key);
      const wStart = startOfWeek(d, { weekStartsOn: 1 });
      const wEnd = endOfWeek(d, { weekStartsOn: 1 });
      const wKey = format(wStart, 'yyyy-MM-dd');
      if (!weeklyMap[wKey]) {
        weeklyMap[wKey] = {
          label: `${format(wStart, 'd MMM', { locale: id })} - ${format(wEnd, 'd MMM yyyy', { locale: id })}`,
          counts: {},
        };
      }
      PERMISSION_TYPES.forEach(t => {
        const c = dailyMap[key][t] || 0;
        if (c) weeklyMap[wKey].counts[t] = (weeklyMap[wKey].counts[t] || 0) + c;
      });
    });
    const weeklyRows = Object.keys(weeklyMap).sort().map(k => ({
      'Minggu': weeklyMap[k].label,
      ...rowFor(weeklyMap[k].counts),
    }));

    // 3. Kelompokkan hari ke bulan
    const monthlyMap: Record<string, { label: string; counts: Partial<Record<PermissionType, number>> }> = {};
    dayKeys.forEach(key => {
      const d = parseISO(key);
      const mKey = format(d, 'yyyy-MM');
      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = { label: format(d, 'MMMM yyyy', { locale: id }), counts: {} };
      }
      PERMISSION_TYPES.forEach(t => {
        const c = dailyMap[key][t] || 0;
        if (c) monthlyMap[mKey].counts[t] = (monthlyMap[mKey].counts[t] || 0) + c;
      });
    });
    const monthlyRows = Object.keys(monthlyMap).sort().map(k => ({
      'Bulan': monthlyMap[k].label,
      ...rowFor(monthlyMap[k].counts),
    }));

    // 4. Data lengkap (semua status, untuk audit)
    const rawRows = [...permissions]
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .map(p => {
        const teacher = teachers.find(t => t.id === p.teacher_id);
        return {
          'Nama Guru': teacher?.name || 'Unknown',
          'Mapel/Unit': teacher?.subject || '-',
          'Jenis Izin': p.permission_type,
          'Tanggal Mulai': p.start_date,
          'Tanggal Selesai': p.end_date,
          'Jumlah Hari': differenceInDays(parseISO(p.end_date), parseISO(p.start_date)) + 1,
          'Jam Mulai': p.start_time || '',
          'Jam Selesai': p.end_time || '',
          'Status': p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : getStatusLabel(p),
          'Alasan': p.reason,
          'Diajukan': p.created_at ? format(parseISO(p.created_at), 'd MMM yyyy HH:mm', { locale: id }) : '',
        };
      });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Rekap Harian');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weeklyRows), 'Rekap Mingguan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Rekap Bulanan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), 'Data Lengkap');
    XLSX.writeFile(wb, `rekap-izin-gurusync-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              onClick={handleExportRekap}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-on-surface bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-all text-sm"
              title="Unduh rekap harian, mingguan, dan bulanan dalam Excel"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Rekap Excel
            </button>
          )}
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl font-bold text-on-primary hover:brightness-95 transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            {isManagement && !isAdmin ? 'Ajukan Izin Pribadi' : isAdmin ? 'Tambah Izin' : 'Ajukan Izin'}
          </button>
        </div>
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
            const completedSteps = getCompletedSteps(perm);
            const canEdit = perm.teacher_id === currentTeacherId && perm.status === getFirstStageStatus(perm);

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
                      {getStatusLabel(perm)}
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
                    {perm.status.startsWith('pending') && (perm.teacher_id === currentTeacherId || isAdmin) && (() => {
                      const approvers = getEligibleApprovers(perm);
                      if (approvers.length === 0) return null;
                      return (
                        <button
                          onClick={() => {
                            if (approvers.length === 1) {
                              window.open(buildWaLink(perm, approvers[0]), '_blank', 'noopener,noreferrer');
                            } else {
                              setSelectedPermission(perm);
                            }
                          }}
                          className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-all"
                          title={approvers.length === 1 ? `Kirim WA ke ${approvers[0].name}` : 'Pilih approver untuk dikirimi WA'}
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                        </button>
                      );
                    })()}
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
                        {perm.permission_type === 'Tugas Luar' && perm.tujuan_tugas_luar && (
                          <div>
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Tujuan Tugas Luar</p>
                            <p className="text-sm text-on-surface bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20">{perm.tujuan_tugas_luar}</p>
                          </div>
                        )}
                        {perm.permission_type === 'Cuti' && perm.guru_pengganti_id && (
                          <div>
                            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Guru Pengganti</p>
                            <p className="text-sm text-on-surface bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20">
                              {getTeacherName(perm.guru_pengganti_id)}
                            </p>
                          </div>
                        )}
                        {perm.permission_type === 'Cuti' && perm.status === 'approved' && (
                          <button
                            onClick={() => handlePrintCuti(perm)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-hover transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            Cetak Surat Cuti
                          </button>
                        )}
                        {perm.rejection_note && (
                          <div className="bg-error-container/30 rounded-xl p-4 border border-error/20">
                            <p className="text-[10px] font-label uppercase tracking-widest text-error/70 mb-1 font-bold">Catatan Penolakan</p>
                            <p className="text-sm text-on-surface">{perm.rejection_note}</p>
                          </div>
                        )}
                        {perm.status.startsWith('pending') && (perm.teacher_id === currentTeacherId || isAdmin) && (() => {
                          const approvers = getEligibleApprovers(perm);
                          if (approvers.length === 0) return null;
                          return (
                            <div>
                              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold">Notifikasi WhatsApp</p>
                              <div className="flex flex-col gap-2">
                                {approvers.map(a => (
                                  <a
                                    key={a.id}
                                    href={buildWaLink(perm, a)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors font-bold text-sm"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">chat</span>
                                      Kirim WA ke {a.name}
                                    </span>
                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100]">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl relative overflow-hidden max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="h-1.5 bg-primary shrink-0" />
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
              <div>
                <h4 className="text-xl sm:text-2xl font-bold text-on-surface">
                  {editingPermission ? 'Edit Pengajuan Izin' : 'Formulir Pengajuan Izin'}
                </h4>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                  Isi formulir dengan lengkap dan benar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Teacher Selector (admin only) */}
                {isAdmin ? (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Guru</label>
                    <select
                      value={formData.teacher_id}
                      onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface font-bold text-sm"
                      required
                    >
                      <option value="">Pilih Guru</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 font-bold">Mengajukan izin untuk:</p>
                    <p className="text-base font-bold text-primary">{getTeacherName(currentTeacherId || '')}</p>
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
                        onClick={() => setFormData({
                          ...formData,
                          permission_type: type,
                          tugas_luar_kampus: type === 'Tugas Luar' ? formData.tugas_luar_kampus : '',
                          tujuan_tugas_luar: type === 'Tugas Luar' ? formData.tujuan_tugas_luar : '',
                          guru_pengganti_id: type === 'Cuti' ? formData.guru_pengganti_id : '',
                        })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.permission_type === type
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{TYPE_ICONS[type]}</span>
                        <span className="text-center leading-tight">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kampus Asal pengaju (khusus tipe Tugas Luar) -- menentukan Kepsek mana yang approve, BUKAN tujuan tugas */}
                {formData.permission_type === 'Tugas Luar' && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Kampus Asal Anda <span className="text-on-surface-variant/40 normal-case">(kampus tempat Anda bertugas sehari-hari, bukan tujuan tugas luar)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tugas_luar_kampus: 'utama' })}
                        className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.tugas_luar_kampus === 'utama'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        Saya dari Kampus Utama (MM2100)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tugas_luar_kampus: 'kampus_03' })}
                        className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.tugas_luar_kampus === 'kampus_03'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        Saya dari Kampus 03
                      </button>
                    </div>
                  </div>
                )}

                {/* Tujuan Tugas Luar (keterangan bebas, tidak memengaruhi alur approval) */}
                {formData.permission_type === 'Tugas Luar' && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Tujuan Tugas Luar</label>
                    <textarea
                      value={formData.tujuan_tugas_luar}
                      onChange={e => setFormData({ ...formData, tujuan_tugas_luar: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface leading-relaxed resize-none text-sm"
                      placeholder="Contoh: Workshop di Kampus 03, rapat di Dinas Pendidikan, dsb."
                      required
                    />
                  </div>
                )}

                {/* Guru Pengganti (khusus Cuti) */}
                {formData.permission_type === 'Cuti' && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">
                      Guru Pengganti <span className="text-on-surface-variant/40 normal-case">(opsional)</span>
                    </label>
                    <select
                      value={formData.guru_pengganti_id}
                      onChange={e => setFormData({ ...formData, guru_pengganti_id: e.target.value })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface text-sm"
                    >
                      <option value="">Belum ditentukan</option>
                      {teachers
                        .filter(t => t.id !== (isAdmin ? formData.teacher_id : currentTeacherId))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Approval hint */}
                {formData.permission_type && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm bg-primary-fixed text-on-primary-fixed-variant border border-primary-fixed-dim">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">info</span>
                    <span>
                      {formData.permission_type === 'Tugas Luar' && formData.tugas_luar_kampus === 'kampus_03' ? (
                        'Alur: Guru → Kepala Sekolah Kampus 03 (langsung, tanpa HOD/Wakasek)'
                      ) : (
                        <>
                          Alur: Guru → {isNormatif(isAdmin ? formData.teacher_id : (currentTeacherId || '')) ? '' : 'HOD → '}Wakasek
                          {needsKepsek(formData.permission_type) ? ' → Kepala Sekolah' : ''}
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Tanggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block min-h-[28px]">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block min-h-[28px]">
                      Tanggal Selesai <span className="text-on-surface-variant/40 normal-case">(opsional, default sama dengan tanggal mulai)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date || undefined}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface text-sm"
                    />
                  </div>
                </div>

                {/* Jam (hanya untuk tipe berbasis waktu) */}
                {isTimeBased(formData.permission_type) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block min-h-[28px]">
                        {formData.permission_type === 'Pulang Cepat' ? 'Jam Pulang'
                          : formData.permission_type === 'Tugas Luar' ? 'Jam Berangkat'
                          : 'Jam Masuk / Mulai'}
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-primary text-on-surface text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block min-h-[28px]">
                        {formData.permission_type === 'Terlambat'
                          ? 'Jam Tiba'
                          : formData.permission_type === 'Tugas Luar' ? 'Jam Kembali'
                          : 'Jam Kembali / Selesai'}
                        <span className="text-on-surface-variant/40 normal-case"> (opsional)</span>
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-primary text-on-surface text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Alasan */}
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Alasan / Keterangan</label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface leading-relaxed resize-none text-sm"
                    placeholder="Jelaskan alasan pengajuan secara rinci..."
                    required
                  />
                </div>

                {/* Status override (admin only) */}
                {isAdmin && (
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 font-bold block">Status (Admin Override)</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as PermissionStatus })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface font-bold text-sm"
                    >
                      <option value="pending_hod">Menunggu HOD</option>
                      <option value="pending_wakasek">Menunggu Wakasek</option>
                      <option value="pending_kepsek">Menunggu Kepsek</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Sticky Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-sm flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.permission_type || (!isAdmin && !currentTeacherId) || (formData.permission_type === 'Tugas Luar' && (!formData.tugas_luar_kampus || !formData.tujuan_tugas_luar))}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {loading ? 'Menyimpan...' : 'Simpan Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
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
