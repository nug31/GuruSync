import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Phone, Calendar, Briefcase, 
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
    <div className="min-h-screen bg-[#FDFDFE] selection:bg-blue-100 selection:text-blue-700 pb-20">
      {/* Visual Top Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Profile Card Main */}
        <div className="mt-12 group">
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-slate-50 overflow-hidden">
            
            {/* Header Content */}
            <div className="pt-12 pb-10 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-end gap-8">
              <div className="relative">
                <div className="w-36 h-36 rounded-[2rem] overflow-hidden bg-slate-50 ring-8 ring-slate-50/50 shadow-inner group-hover:ring-blue-50 transition-all duration-500">
                  {teacher.avatar_url ? (
                    <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><User className="w-16 h-16 text-slate-200" /></div>
                  )}
                  {canEdit && (
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                      <span className="text-white text-[10px] font-black tracking-widest uppercase">{uploading ? '...' : 'Upload'}</span>
                    </label>
                  )}
                </div>
                {activeLeave && (
                  <div className="absolute -top-2 -right-2 bg-rose-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center animate-bounce shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  <ShieldCheck className="w-3 h-3" />
                  {teacher.subject}
                </div>
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                  {teacher.name}
                </h1>
                <p className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-2 text-sm italic">
                  {teacher.work_unit || 'Guru Sync Network'}
                </p>
              </div>

              <div className="hidden sm:block pb-2">
                 <div className={`px-4 py-3 rounded-2xl border text-center transition-all ${activeLeave ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${activeLeave ? 'text-rose-500' : 'text-emerald-500'}`}>
                      STATUS
                    </p>
                    <p className={`text-sm font-bold ${activeLeave ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {activeLeave ? 'Sedang Cuti' : 'Aktif Bekerja'}
                    </p>
                 </div>
              </div>
            </div>

            {/* Info Grid Split */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-t border-slate-50/80">
              {/* Personal Data Column */}
              <div className="md:col-span-8 p-10 space-y-12">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                      Data Pribadi
                    </h2>
                    <div className="h-px flex-1 bg-slate-50 ml-6"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12">
                    {[
                      { label: 'NIK', value: teacher.nik, icon: Contact },
                      { 
                        label: 'TTL', 
                        value: `${teacher.birth_place ? `${teacher.birth_place}, ` : ''}${teacher.birth_date ? format(parseISO(teacher.birth_date), 'dd MMM yyyy', { locale: id }) : '-'}`, 
                        icon: CalendarDays 
                      },
                      { 
                        label: 'Kelamin', 
                        value: teacher.gender === 'L' ? 'Laki-laki' : teacher.gender === 'P' ? 'Perempuan' : (teacher.gender || '-'),
                        icon: Contact 
                      },
                      { label: 'Pendidikan', value: teacher.education || '-', icon: GraduationCap },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-blue-500 group-hover/item:bg-blue-50 transition-all">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-slate-700">{item.value}</p>
                        </div>
                      </div>
                    ))}
                    <div className="sm:col-span-2 flex gap-4 pr-10">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><MapPin className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alamat</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{teacher.address || '-'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                      Kedisiplinan & Pengembangan
                    </h2>
                    <div className="h-px flex-1 bg-slate-50 ml-6"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 mb-10">
                    <div className="flex gap-4 group/item">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        teacher.sp_level && teacher.sp_level !== 'Tidak ada' 
                        ? 'bg-rose-50 text-rose-500' 
                        : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Kedisiplinan</p>
                        <p className={`text-sm font-bold ${
                          teacher.sp_level && teacher.sp_level !== 'Tidak ada' ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {teacher.sp_level || 'Tidak ada'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="w-5 h-5 text-blue-500" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Riwayat Training</h3>
                    </div>
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                      {teacher.training_history ? (
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {teacher.training_history}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Belum ada riwayat training yang tercatat.</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                      Riwayat Cuti
                    </h2>
                    <div className="h-px flex-1 bg-slate-50 ml-6"></div>
                  </div>

                  {leaves.length === 0 ? (
                    <div className="bg-slate-50/50 rounded-[1.5rem] p-10 text-center border border-dashed border-slate-100">
                      <p className="text-slate-400 font-medium text-sm">Tidak ada catatan riwayat cuti</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leaves.slice(0, 3).map((leave) => (
                        <div key={leave.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl hover:border-blue-100 hover:shadow-sm transition-all group/leave">
                           <div className="flex items-center gap-4">
                              <div className={`w-2 h-2 rounded-full ${
                                leave.status === 'approved' ? 'bg-emerald-400' : leave.status === 'rejected' ? 'bg-rose-400' : 'bg-amber-400'
                              }`} />
                              <div>
                                <p className="text-sm font-bold text-slate-700">{leave.leave_type}</p>
                                <p className="text-[10px] font-medium text-slate-400 tracking-wide">
                                  {format(parseISO(leave.start_date), 'dd MMM')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                                </p>
                              </div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-200 group-hover/leave:text-blue-300 transition-colors" />
                        </div>
                      ))}
                      {leaves.length > 3 && (
                        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-2">
                          + {leaves.length - 3} riwayat lainnya
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar Stats Column */}
              <div className="md:col-span-4 bg-slate-50/50 p-10 space-y-10 border-l border-slate-50/80">
                <div className="space-y-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bergabung Sejak</p>
                      <p className="text-md font-bold text-slate-700">{format(parseISO(teacher.join_date), 'dd MMMM yyyy')}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masa Kerja</p>
                      <p className="text-md font-bold text-slate-700">{getWorkDuration(teacher.join_date)}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sisa Cuti Tahunan ({currentYear})</p>
                      <div className="flex items-center gap-2">
                        <p className="text-md font-bold text-slate-700">{remainingAnnualLeaves} Hari</p>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">dari {annualLeaveQuota}</span>
                      </div>
                   </div>
                   <div className="pt-4 space-y-4">
                      <div className="h-px w-12 bg-slate-200"></div>
                      <div className="flex flex-col gap-4">
                        <a href={`mailto:${teacher.email}`} className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors group/link text-sm font-medium">
                           <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover/link:border-blue-200 transition-all"><Mail className="w-4 h-4" /></div>
                           {teacher.email}
                        </a>
                        <a href={`tel:${teacher.phone}`} className="flex items-center gap-3 text-slate-600 hover:text-emerald-600 transition-colors group/link text-sm font-medium">
                           <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover/link:border-emerald-200 transition-all"><Phone className="w-4 h-4" /></div>
                           {teacher.phone}
                        </a>
                      </div>
                   </div>
                </div>

                <div className="pt-10">
                   <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Hubungi Guru
                   </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Minimalist */}
        <div className="mt-16 text-center space-y-2 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
           <p className="text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase">GuruSync Official Profile</p>
           <p className="text-[9px] font-medium text-slate-300">Generated for Digital Identity Verification System</p>
        </div>
      </div>
    </div>
  );
}
