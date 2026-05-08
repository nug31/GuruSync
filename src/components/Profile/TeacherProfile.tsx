import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Phone, 
  MapPin, GraduationCap, CalendarDays, 
  Contact, Info, ShieldCheck, ChevronRight,
  Award, ShieldAlert
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Teacher, Leave } from '../../types';

interface TeacherProfileProps {
  teacherId: string;
}

export function TeacherProfile({ teacherId }: TeacherProfileProps) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();

  const canEdit = profile?.role === 'admin' || (user && teacher && user.id === teacher.user_id);

  useEffect(() => {
    loadTeacherData();
  }, [teacherId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Ukuran file terlalu besar. Maksimal 2MB.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${teacherId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await (supabase.from('teachers') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', teacherId);

      if (updateError) throw updateError;
      setTeacher(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      alert('Foto profil diperbarui!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Gagal mengupload foto profil');
    } finally {
      setUploading(false);
    }
  };

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const [teacherRes, leavesRes] = await Promise.all([
        supabase.from('teachers').select('*').eq('id', teacherId).maybeSingle(),
        supabase.from('leaves').select('*').eq('teacher_id', teacherId).order('start_date', { ascending: false }),
      ]);
      if (teacherRes.data) setTeacher(teacherRes.data as any);
      if (leavesRes.data) setLeaves(leavesRes.data as any);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkDuration = (joinDate: string) => {
    const days = differenceInDays(new Date(), parseISO(joinDate));
    return `${Math.floor(days / 365)} thn ${Math.floor((days % 365) / 30)} bln`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-50 rounded"></div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800">Profil Tidak Tersedia</h2>
            <p className="text-slate-500 mt-2">ID Guru tidak valid atau datanya telah dihapus.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeLeave = leaves.find(l => 
    l.status === 'approved' && new Date(l.start_date) <= new Date() && new Date(l.end_date) >= new Date()
  );

  const annualLeaveQuota = teacher.annual_leave_quota ?? 12;
  const currentYear = new Date().getFullYear();
  const usedAnnualLeaves = leaves
    .filter(l => 
      l.leave_type === 'Cuti Tahunan' && 
      l.status === 'approved' &&
      new Date(l.start_date).getFullYear() === currentYear
    )
    .reduce((total, l) => total + (differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1), 0);
  const remainingAnnualLeaves = Math.max(0, annualLeaveQuota - usedAnnualLeaves);

  return (
    <div className="min-h-screen bg-background selection:bg-primary-container/20 pb-20 p-8 lg:p-12">
      {/* Welcome section */}
      <section className="mb-16 mt-4">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b-2 border-on-surface pb-8">
          <div>
            <h2 className="text-5xl font-serif font-bold text-on-surface italic tracking-tight">Halo, {teacher.name.split(',')[0]}</h2>
            <p className="text-xl text-on-surface-variant mt-3 font-serif">Ringkasan profil akademik dan administratif Anda.</p>
          </div>
          <div className="mt-6 md:mt-0 font-label text-sm uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Stats & Profile */}
        <div className="lg:col-span-8 flex flex-col gap-16">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="p-8 bg-surface-container-low border border-outline-variant rounded">
              <p className="font-label text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Sisa Saldo Cuti</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif font-bold">{remainingAnnualLeaves}</span>
                <span className="text-on-surface-variant">/ {annualLeaveQuota} Hari</span>
              </div>
              <div className="mt-6 h-1 bg-surface-container-high w-full">
                <div className="h-full bg-primary" style={{ width: `${(remainingAnnualLeaves / annualLeaveQuota) * 100}%` }}></div>
              </div>
            </div>
            <div className="p-8 bg-surface-container-low border border-outline-variant rounded">
              <p className="font-label text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Cuti Diambil</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif font-bold">{usedAnnualLeaves}</span>
                <span className="text-on-surface-variant">Hari</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-4 italic">Tahun Ajaran {currentYear}</p>
            </div>
            <div className="p-8 bg-surface-container-low border border-outline-variant rounded">
              <p className="font-label text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Sertifikasi</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif font-bold">5</span>
                <span className="text-on-surface-variant">Aktif</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-4 italic">2 Dalam Proses</p>
            </div>
          </div>

          {/* Personal Detail */}
          <div>
            <div className="flex items-center justify-between border-b border-on-surface/10 pb-4 mb-8">
              <h3 className="text-2xl font-serif font-bold">Detail Personal</h3>
              {canEdit && (
                <button className="text-primary font-label text-xs uppercase tracking-widest flex items-center gap-2 hover:underline">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">NIK / NIP</p>
                <p className="text-lg font-serif">{teacher.nik}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Jabatan Akademik</p>
                <p className="text-lg font-serif">{teacher.subject}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Unit Kerja</p>
                <p className="text-lg font-serif">{teacher.work_unit || '-'}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Terdaftar Sejak</p>
                <p className="text-lg font-serif">{format(parseISO(teacher.join_date), 'd MMMM yyyy', { locale: id })}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Email Institusi</p>
                <p className="text-lg font-serif underline decoration-primary/30">{teacher.email}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Masa Kerja</p>
                <p className="text-lg font-serif">{getWorkDuration(teacher.join_date)}</p>
              </div>
            </div>
          </div>

          {/* Leave History */}
          <div>
            <div className="flex items-center justify-between border-b border-on-surface/10 pb-4 mb-6">
              <h3 className="text-2xl font-serif font-bold">Riwayat Cuti</h3>
              <button className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest hover:text-primary">Arsip Lengkap</button>
            </div>
            <div className="overflow-hidden border border-outline-variant rounded">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="p-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Jenis</th>
                    <th className="p-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Durasi</th>
                    <th className="p-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Diajukan</th>
                    <th className="p-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant italic">Belum ada riwayat cuti</td>
                    </tr>
                  ) : (
                    leaves.slice(0, 5).map((leave) => (
                      <tr key={leave.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4">
                          <p className="font-serif font-bold">{leave.leave_type}</p>
                          <p className="text-xs text-on-surface-variant italic">{leave.reason}</p>
                        </td>
                        <td className="p-4 font-serif italic text-on-surface">
                          {differenceInDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1} Hari
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant">
                          {format(parseISO(leave.created_at || leave.start_date), 'd MMM yyyy', { locale: id })}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`status-badge px-2 py-1 rounded-sm border ${
                            leave.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            leave.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Identity & Certs */}
        <div className="lg:col-span-4 flex flex-col gap-12">
          {/* ID Card (Editorial Style) */}
          <div className="border-2 border-on-surface p-2 rounded-sm">
            <div className="bg-surface-container-lowest p-8 border border-outline-variant flex flex-col items-center">
              <div className="w-full flex justify-between border-b border-on-surface/10 pb-4 mb-8">
                <span className="font-label text-[10px] uppercase tracking-[0.3em] font-bold">Academic Identity</span>
                <span className={`material-symbols-outlined text-[18px] ${activeLeave ? 'text-error' : 'text-primary'}`}>
                  {activeLeave ? 'event_busy' : 'verified'}
                </span>
              </div>
              <div className="relative group">
                <div className="w-40 h-40 border-2 border-on-surface p-2 mb-6 transition-all duration-500 overflow-hidden">
                  {teacher.avatar_url ? (
                    <img alt={teacher.name} className="w-full h-full object-cover" src={teacher.avatar_url} />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
                    </div>
                  )}
                </div>
                {canEdit && (
                  <label className="absolute inset-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                    <span className="text-white text-[10px] font-black tracking-widest uppercase">{uploading ? '...' : 'Upload'}</span>
                  </label>
                )}
              </div>
              <h4 className="text-2xl font-serif font-bold text-center">{teacher.name}</h4>
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">NIP: {teacher.nik}</p>
              
              <div className="my-8 p-4 border border-outline-variant bg-white">
                {/* QR Code Placeholder */}
                <div className="w-32 h-32 bg-surface-container flex items-center justify-center opacity-90">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">qr_code_2</span>
                </div>
              </div>
              <p className="text-[11px] text-center italic text-on-surface-variant px-4 mb-8">
                Pindai kode ini untuk keperluan administrasi institusi dan verifikasi kehadiran harian.
              </p>
              <button className="w-full py-3 bg-surface-container-high border border-outline text-on-surface font-label text-[10px] uppercase tracking-widest hover:bg-on-surface hover:text-white transition-all">
                Simpan ke Perangkat
              </button>
            </div>
          </div>

          {/* Certifications */}
          <div className="p-8 border border-outline-variant bg-surface-container-lowest">
            <h3 className="text-xl font-serif font-bold mb-6 italic">Sertifikasi & Keahlian</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 text-[10px] font-label uppercase tracking-wider">Pedagogi Digital</span>
              <span className="px-3 py-1 bg-secondary/5 text-secondary border border-secondary/10 text-[10px] font-label uppercase tracking-wider">Analisis Data</span>
              <span className="px-3 py-1 bg-tertiary/5 text-tertiary border border-tertiary/10 text-[10px] font-label uppercase tracking-wider">STEM</span>
            </div>
            <div className="space-y-4">
              {teacher.training_history ? (
                <div className="flex items-start gap-4 p-3 hover:bg-surface-container-low transition-colors group">
                  <span className="material-symbols-outlined text-primary mt-0.5">workspace_premium</span>
                  <div>
                    <p className="text-sm font-bold font-serif leading-tight">Riwayat Pengembangan</p>
                    <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">{teacher.training_history}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic">Belum ada riwayat training</p>
              )}
              {teacher.sp_level && teacher.sp_level !== 'Tidak ada' && (
                <div className="flex items-start gap-4 p-3 bg-red-50/50 border-t border-red-100 mt-4">
                  <span className="material-symbols-outlined text-error mt-0.5">warning</span>
                  <div>
                    <p className="text-sm font-bold font-serif leading-tight text-error">Catatan Kedisiplinan</p>
                    <p className="text-[11px] text-red-600/70 mt-1">{teacher.sp_level}</p>
                  </div>
                </div>
              )}
            </div>
            <button className="w-full mt-8 flex items-center justify-center gap-2 text-primary font-label text-[10px] uppercase tracking-widest group">
              Portfolio Lengkap 
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          {/* Tautan Cepat */}
          <div className="p-8 border border-on-surface bg-surface-container-low">
            <h3 className="text-xl font-serif font-bold mb-6">Tautan Cepat</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-outline-variant bg-white text-center hover:border-primary transition-all group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mb-2 block">description</span>
                <span className="font-label text-[10px] uppercase tracking-widest">Slip Gaji</span>
              </button>
              <button className="p-4 border border-outline-variant bg-white text-center hover:border-secondary transition-all group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary mb-2 block">menu_book</span>
                <span className="font-label text-[10px] uppercase tracking-widest">Kurikulum</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
