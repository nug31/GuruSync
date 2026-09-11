import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';
import type { Teacher, Permission } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StatisticsProps {
  teachers: Teacher[];
  permissions: Permission[];
}

export function Statistics({ teachers, permissions }: StatisticsProps) {
  const { profile } = useAuth();
  
  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const activePermissions = permissions.filter(
      (permission) =>
        permission.status === 'approved' &&
        new Date(permission.start_date) <= new Date() &&
        new Date(permission.end_date) >= new Date()
    ).length;

    const avgWorkDuration = teachers.length > 0
      ? teachers.reduce((sum, teacher) => {
          const days = differenceInDays(new Date(), parseISO(teacher.join_date));
          return sum + days / 365;
        }, 0) / teachers.length
      : 0;

    const pendingPermissions = permissions.filter((permission) => permission.status === 'pending_hod' || permission.status === 'pending_wakasek' || permission.status === 'pending_kepsek').length;

    return {
      totalTeachers,
      activePermissions,
      avgWorkDuration: avgWorkDuration.toFixed(1),
      pendingPermissions,
    };
  }, [teachers, permissions]);

  const recentPermissions = useMemo(() => {
    return [...permissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  }, [permissions]);

  const permissionsByMonth = useMemo(() => {
    const monthData: { [key: string]: number } = {};
    permissions.forEach((permission) => {
      const month = format(parseISO(permission.start_date), 'MMM yyyy', { locale: id });
      monthData[month] = (monthData[month] || 0) + 1;
    });
    return Object.entries(monthData).map(([month, count]) => ({ month, count })).slice(-12);
  }, [permissions]);

  const permissionsByStatus = useMemo(() => {
    const statusData: { [key: string]: number } = { pending_hod: 0, pending_wakasek: 0, pending_kepsek: 0, approved: 0, rejected: 0 };
    permissions.forEach((permission) => { statusData[permission.status]++; });
    
    // Group pending statuses
    const pendingTotal = statusData.pending_hod + statusData.pending_wakasek + statusData.pending_kepsek;
    
    return [
      { status: 'Menunggu', count: pendingTotal },
      { status: 'Disetujui', count: statusData.approved },
      { status: 'Ditolak', count: statusData.rejected }
    ];
  }, [permissions]);

  const userName = profile?.name || profile?.email || 'User';

  return (
    <>
      {/* Welcome Section */}
      <section className="pt-4 pb-8 lg:pt-6 lg:pb-8">
        <div className="max-w-4xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-semibold mb-3 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Portal Administrasi GuruSync
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-on-surface mb-2 tracking-tight">
            Selamat Datang, {userName}
          </h1>
          <p className="text-base lg:text-lg text-on-surface-variant max-w-2xl">
            Berikut adalah ringkasan aktivitas kepegawaian dan perizinan guru hari ini.
          </p>
        </div>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" data-icon="groups">groups</span>
              </div>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]" data-icon="trending_up">trending_up</span>
                Aktif
              </span>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1">Total Guru</p>
              <p className="text-3xl font-extrabold text-on-surface">{stats.totalTeachers}</p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" data-icon="event_note">event_note</span>
              </div>
              <span className="text-on-surface-variant bg-slate-100 px-2.5 py-1 rounded-full text-[11px] font-semibold">Saat ini</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1">Izin Hari Ini</p>
              <p className="text-3xl font-extrabold text-on-surface">{stats.activePermissions}</p>
            </div>
          </div>
          
          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" data-icon="pending_actions">pending_actions</span>
              </div>
              {stats.pendingPermissions > 0 ? (
                <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  Perlu Respon
                </span>
              ) : (
                <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-[11px] font-semibold">Clear</span>
              )}
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1">Menunggu Persetujuan</p>
              <p className="text-3xl font-extrabold text-on-surface">{stats.pendingPermissions}</p>
            </div>
          </div>
          
          {/* Card 4 */}
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" data-icon="schedule">schedule</span>
              </div>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold">Rata-rata</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1">Masa Kerja</p>
              <p className="text-3xl font-extrabold text-on-surface">{stats.avgWorkDuration}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      {/* Content Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-2">
        {/* Table Section */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Pengajuan Izin Terbaru</h3>
              <p className="text-xs text-on-surface-variant mt-1">Daftar permohonan izin guru yang baru masuk</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {recentPermissions.length} Data
            </span>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="pb-4">Nama Guru</th>
                  <th className="pb-4">Jenis Izin</th>
                  <th className="pb-4">Periode</th>
                  <th className="pb-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPermissions.map((permission) => {
                  const teacher = teachers.find(t => t.id === permission.teacher_id);
                  const statusBadges: Record<string, { label: string; cls: string }> = {
                    pending_hod: { label: 'Menunggu HOD', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    pending_wakasek: { label: 'Menunggu Wakasek', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    pending_kepsek: { label: 'Menunggu Kepsek', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                  };
                  const badge = statusBadges[permission.status] || { label: permission.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };

                  return (
                    <tr key={permission.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-primary font-bold flex items-center justify-center text-xs">
                            {teacher?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-on-surface block">{teacher?.name || 'Guru'}</span>
                            <span className="text-xs text-on-surface-variant">{teacher?.subject || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-semibold text-slate-700">{permission.permission_type}</td>
                      <td className="py-4 text-xs text-on-surface-variant font-medium whitespace-nowrap">
                        {format(new Date(permission.start_date), 'dd MMM')} - {format(new Date(permission.end_date), 'dd MMM yyyy')}
                      </td>
                      <td className="py-4 text-right">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full border whitespace-nowrap ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentPermissions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-on-surface-variant text-sm italic">
                      Belum ada data pengajuan izin terbaru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Tren Izin per Bulan</h4>
               <span className="w-2 h-2 rounded-full bg-primary"></span>
             </div>
             <div className="h-56">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={permissionsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Distribusi Status Izin</h4>
               <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
             </div>
             <div className="h-56">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={permissionsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
