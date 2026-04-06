import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, Calendar, Briefcase, Clock, MapPin, GraduationCap, CalendarDays, Contact, Info } from 'lucide-react';
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

  useEffect(() => {
    loadTeacherData();
  }, [teacherId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // 1. Validate File Size (Max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Ukuran file terlalu besar. Maksimal 2MB.');
        return;
      }

      // 2. Validate File Type
      if (!file.type.startsWith('image/')) {
        alert('Hanya diperbolehkan mengupload file gambar.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${teacherId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 5. Update Database
      const { error: updateError } = await (supabase
        .from('teachers') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', teacherId);

      if (updateError) throw updateError;

      // 6. Refresh Local State
      setTeacher(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      alert('Foto profil berhasil diperbarui!');
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
        supabase
          .from('teachers')
          .select('*')
          .eq('id', teacherId)
          .maybeSingle(),
        supabase
          .from('leaves')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('start_date', { ascending: false }),
      ]);

      if (teacherRes.data) setTeacher(teacherRes.data as any);
      if (leavesRes.data) setLeaves(leavesRes.data as any);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkDuration = (joinDate: string) => {
    const days = differenceInDays(new Date(), parseISO(joinDate));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);

    if (years > 0) {
      return `${years} tahun ${months} bulan`;
    }
    return `${months} bulan`;
  };

  const getLeaveDuration = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-gray-600">Data guru tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const activeLeave = leaves.find(
    (leave) =>
      leave.status === 'approved' &&
      new Date(leave.start_date) <= new Date() &&
      new Date(leave.end_date) >= new Date()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/40">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 opacity-90 backdrop-blur-sm">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          </div>
          
          <div className="relative px-8 pt-16 pb-6 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="bg-white p-1 rounded-full shadow-2xl ring-4 ring-blue-500 ring-opacity-10">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-2 border-white group">
                  {teacher.avatar_url ? (
                    <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <User className="w-20 h-20 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    <Clock className="w-6 h-6 text-white mb-1 animate-bounce" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest text-center px-4">
                      {uploading ? 'Mengupload...' : 'Ubah Foto'}
                    </span>
                  </label>
                </div>
              </div>
              
              {activeLeave && (
                <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white rounded-full p-2 shadow-lg border-2 border-white animate-pulse">
                  <Calendar className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {teacher.name}
              </h1>
              <div className="flex items-center justify-center space-x-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 shadow-sm">
                  {teacher.subject}
                </span>
                {activeLeave && (
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    Sedang Cuti
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Details Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Data Pribadi</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: 'NIK', value: teacher.nik, icon: Contact },
                  { label: 'Tanggal Lahir', value: teacher.birth_date ? format(parseISO(teacher.birth_date), 'dd MMMM yyyy', { locale: id }) : '-', icon: CalendarDays },
                  { label: 'Jenis Kelamin', value: teacher.gender || '-', icon: Contact },
                  { label: 'Pendidikan', value: teacher.education || '-', icon: GraduationCap },
                ].map((item, idx) => (
                  <div key={idx} className="group hover:bg-slate-50 p-4 rounded-2xl transition-colors duration-300 border border-transparent hover:border-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md transition-all">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-lg font-semibold text-slate-700">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="group hover:bg-slate-50 p-4 rounded-2xl transition-colors duration-300 border border-transparent hover:border-slate-100 col-span-full">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md transition-all">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat Lengkap</p>
                      <p className="text-lg font-semibold text-slate-700 leading-relaxed">{teacher.address || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave History Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Riwayat Cuti</h2>
              </div>

              {leaves.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium tracking-wide">Belum ada catatan riwayat cuti</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="group bg-white rounded-3xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl shadow-sm ${
                            leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            leave.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {leave.leave_type}
                            </h3>
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                              <CalendarDays className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {format(parseISO(leave.start_date), 'dd MMM', { locale: id })} - {format(parseISO(leave.end_date), 'dd MMM yyyy', { locale: id })}
                              </span>
                              <span className="text-slate-300 mx-1">•</span>
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">{getLeaveDuration(leave.start_date, leave.end_date)} Hari</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm border ${
                          leave.status === 'approved' ? 'bg-emerald-500 text-white border-emerald-400' :
                          leave.status === 'rejected' ? 'bg-rose-500 text-white border-rose-400' : 'bg-amber-400 text-slate-900 border-amber-300'
                        }`}>
                          {leave.status === 'pending' ? 'Menunggu' : leave.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 group-hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                          <p className="text-slate-600 font-medium italic leading-relaxed">
                            "{leave.reason}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Professional Info Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-200">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Status Kerja</h2>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: 'Bergabung Sejak', value: format(parseISO(teacher.join_date), 'dd MMMM yyyy', { locale: id }), icon: Calendar, color: 'text-emerald-500' },
                  { label: 'Masa Kerja', value: getWorkDuration(teacher.join_date), icon: Clock, color: 'text-amber-500' },
                  { label: 'Status', value: 'Aktif Bekerja', icon: Briefcase, color: 'text-blue-500' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="bg-slate-50 p-3 rounded-2xl shadow-inner group-hover:bg-white group-hover:shadow-md transition-all">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                      <p className="text-md font-bold text-slate-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-slate-900 rounded-4xl shadow-2xl p-8 border border-slate-800 hover:shadow-blue-900/40 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Hubungi Guru</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <Mail className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mb-0.5">Email Kantor</p>
                      <p className="text-sm font-semibold text-slate-200 truncate w-full max-w-[180px]">{teacher.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <Phone className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mb-0.5">Nomer Telepon</p>
                      <p className="text-sm font-semibold text-slate-200">{teacher.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-800">
                <button className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Mail className="w-5 h-5" />
                  Kirim Pesan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-12">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
            Sistem Manajemen Guru &bull; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
