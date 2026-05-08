import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import type { Teacher } from '../../types';

interface TeacherPublicProfileProps {
  teacherId: string;
}

export function TeacherPublicProfile({ teacherId }: TeacherPublicProfileProps) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeacherData();
  }, [teacherId]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teachers').select('*').eq('id', teacherId).maybeSingle();
      if (error) throw error;
      if (data) setTeacher(data as Teacher);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-surface-container-high rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-surface-container-low rounded"></div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-4xl text-outline mb-4">error</span>
            <h2 className="text-xl font-bold font-headline text-on-surface">Profil Tidak Ditemukan</h2>
            <p className="text-on-surface-variant mt-2 font-body text-sm">ID Guru tidak valid atau data telah dihapus dari sistem.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden min-h-screen">
      {/* Top Navigation Anchor */}
      <nav className="flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl">
        <div className="font-headline text-xl font-bold text-primary tracking-tight">GuruSync</div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span className="font-label text-xs uppercase tracking-widest text-primary font-bold">Official Verification</span>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8 relative">
        {/* Verification Watermark Background */}
        <div className="seal-watermark flex flex-col items-center absolute inset-0 opacity-[0.03] pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', width: '80%' }}>
          <span className="material-symbols-outlined text-[200px]">verified</span>
          <p className="font-headline text-4xl font-bold text-center mt-4">OFFICIAL GURUSYNC CREDENTIAL</p>
        </div>

        <div className="relative z-10">
          {/* Header Badge Section */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-full flex items-center gap-2 shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>new_releases</span>
              <span className="font-label text-xs font-bold tracking-widest uppercase">Verified Profile</span>
            </div>
          </div>

          {/* Profile Portrait Card */}
          <div className="bg-surface-container-lowest p-2 rounded-full mx-auto w-56 h-56 mb-8 relative group shadow-sm">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-surface-container-high shadow-lg flex items-center justify-center bg-surface-container">
              {teacher.avatar_url ? (
                <img alt={teacher.name} className="w-full h-full object-cover" src={teacher.avatar_url} />
              ) : (
                <span className="material-symbols-outlined text-[80px] text-on-surface-variant">person</span>
              )}
            </div>
            {/* Status Indicator */}
            <div className="absolute bottom-4 right-4 bg-surface-container-lowest p-1 rounded-full">
              <div className="bg-tertiary flex items-center gap-1.5 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="font-label text-[10px] font-bold text-white uppercase tracking-tighter">Aktif</span>
              </div>
            </div>
          </div>

          {/* Identity Header */}
          <div className="text-center mb-10">
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 leading-tight">{teacher.name}</h1>
            <p className="font-label text-sm uppercase tracking-[0.2em] text-primary font-semibold">{teacher.subject}</p>
          </div>

          {/* Information Bento Grid Style */}
          <div className="space-y-4">
            {/* Primary Credentials Card */}
            <div className="bg-surface-container-low rounded-xl p-6 relative overflow-hidden border border-outline-variant/20">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Employee ID (NIP / NIK)</p>
                  <p className="font-body text-lg font-semibold tracking-wide">{teacher.nik}</p>
                </div>
                <span className="material-symbols-outlined text-surface-variant text-4xl">badge</span>
              </div>
              <div className="pt-4 border-t border-outline-variant/20">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Unit Kerja / Department</p>
                <p className="font-headline text-lg italic text-on-surface">{teacher.work_unit || 'Guru Pengajar'}</p>
              </div>
            </div>

            {/* Academic Section */}
            {teacher.education && (
              <div className="bg-surface-container-highest/40 backdrop-blur-sm rounded-xl p-6 border border-outline-variant/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">school</span>
                  </div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Academic Background</p>
                </div>
                <div className="space-y-1">
                  <p className="font-headline text-lg font-bold">{teacher.education}</p>
                </div>
              </div>
            )}

            {/* Verification Footer Details */}
            <div className="bg-surface-dim/30 border border-outline-variant/10 rounded-xl p-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs text-on-surface-variant">Verified on</span>
                  <span className="font-body text-xs font-semibold">{format(new Date(), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs text-on-surface-variant">Authority</span>
                  <span className="font-body text-xs font-semibold">GuruSync Platform</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs text-on-surface-variant">Token</span>
                  <span className="font-body text-[10px] text-primary/60 font-mono tracking-tighter">GURUSYNC-{teacher.id.split('-')[0].toUpperCase()}-{new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
