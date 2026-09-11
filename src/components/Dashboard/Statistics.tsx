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
      <section className="pt-4 pb-8 lg:pt-8 lg:pb-8">
        <div className="max-w-4xl border-b border-on-surface/10 pb-4 mb-8">
          <h1 className="text-4xl lg:text-6xl font-display text-on-surface mb-4 leading-tight">Welcome back, {userName}.</h1>
          <p className="text-lg lg:text-xl font-headline italic text-on-surface-variant max-w-2xl leading-relaxed">Here's a quick overview of what's happening at GuruSync Academy today.</p>
        </div>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-outline-variant">
          {/* Card 1 */}
          <div className="p-8 border-r border-b border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-bright">
            <div className="flex justify-between items-start mb-12">
              <div className="text-primary">
                <span className="material-symbols-outlined text-3xl" data-icon="groups">groups</span>
              </div>
              <span className="text-emerald-700 label-caps text-[10px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" data-icon="trending_up">trending_up</span>
                Aktif
              </span>
            </div>
            <p className="label-caps text-on-surface-variant text-xs mb-2">Total Guru</p>
            <p className="text-4xl font-display text-on-surface">{stats.totalTeachers}</p>
          </div>
          
          {/* Card 2 */}
          <div className="p-8 border-r border-b border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-bright">
            <div className="flex justify-between items-start mb-12">
              <div className="text-secondary">
                <span className="material-symbols-outlined text-3xl" data-icon="event_note">event_note</span>
              </div>
              <span className="text-on-surface-variant label-caps text-[10px] italic">Saat ini</span>
            </div>
            <p className="label-caps text-on-surface-variant text-xs mb-2">Izin Aktif</p>
            <p className="text-4xl font-display text-on-surface">{stats.activePermissions}</p>
          </div>
          
          {/* Card 3 */}
          <div className="p-8 border-r border-b border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-bright">
            <div className="flex justify-between items-start mb-12">
              <div className="text-tertiary">
                <span className="material-symbols-outlined text-3xl" data-icon="pending_actions">pending_actions</span>
              </div>
              {stats.pendingPermissions > 0 && (
                <span className="text-error label-caps text-[10px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" data-icon="warning">warning</span>
                  Perlu Aksi
                </span>
              )}
            </div>
            <p className="label-caps text-on-surface-variant text-xs mb-2">Menunggu Persetujuan</p>
            <p className="text-4xl font-display text-on-surface">{stats.pendingPermissions}</p>
          </div>
          
          {/* Card 4 */}
          <div className="p-8 border-r border-b border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-bright">
            <div className="flex justify-between items-start mb-12">
              <div className="text-primary-container">
                <span className="material-symbols-outlined text-3xl" data-icon="school">school</span>
              </div>
              <span className="text-primary label-caps text-[10px] italic">Tahun</span>
            </div>
            <p className="label-caps text-on-surface-variant text-xs mb-2">Rata-rata Masa Kerja</p>
            <p className="text-4xl font-display text-on-surface">{stats.avgWorkDuration}</p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16 mt-8">
        {/* Table Section */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-baseline justify-between border-b border-outline-variant pb-4">
            <h3 className="text-3xl font-display text-on-surface">Recent Permission Requests</h3>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="px-4 py-4 label-caps text-on-surface-variant text-[11px]">Teacher</th>
                  <th className="px-4 py-4 label-caps text-on-surface-variant text-[11px]">Permission Type</th>
                  <th className="px-4 py-4 label-caps text-on-surface-variant text-[11px]">Date Range</th>
                  <th className="px-4 py-4 label-caps text-on-surface-variant text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentPermissions.map((permission) => {
                  const teacher = teachers.find(t => t.id === permission.teacher_id);
                  const isPending = permission.status.includes('pending');
                  const statusColors: Record<string, string> = {
                    pending_hod: 'border-tertiary text-tertiary-container bg-tertiary/5',
                    pending_wakasek: 'border-tertiary text-tertiary-container bg-tertiary/5',
                    pending_kepsek: 'border-tertiary text-tertiary-container bg-tertiary/5',
                    approved: 'border-emerald-700 text-emerald-800 bg-emerald-50',
                    rejected: 'border-error text-error bg-error-container/20'
                  };
                  return (
                    <tr key={permission.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary-fixed text-primary font-display flex items-center justify-center text-sm border border-outline-variant">
                            {teacher?.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-base font-semibold italic text-on-surface whitespace-nowrap">{teacher?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-on-surface-variant font-headline capitalize">{permission.permission_type}</td>
                      <td className="px-4 py-6 text-on-surface-variant font-headline whitespace-nowrap">
                        {format(new Date(permission.start_date), 'MMM dd')} - {format(new Date(permission.end_date), 'MMM dd')}
                      </td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 label-caps text-[10px] border whitespace-nowrap ${statusColors[permission.status] || ''}`}>
                          {isPending ? 'Menunggu' : permission.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentPermissions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant font-body">Belum ada data pengajuan izin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-8">
           <div className="border-b border-outline-variant pb-4">
            <h3 className="text-3xl font-display text-on-surface">Analytics</h3>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant p-6 h-64">
             <h4 className="label-caps text-on-surface-variant text-xs mb-4">Pengajuan per Bulan</h4>
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={permissionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e2e3" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#434653' }} />
                <YAxis tick={{ fontSize: 10, fill: '#434653' }} />
                <Tooltip contentStyle={{ backgroundColor: '#faf9fa', borderColor: '#c3c6d5' }} />
                <Line type="monotone" dataKey="count" stroke="#094cb2" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-6 h-64">
             <h4 className="label-caps text-on-surface-variant text-xs mb-4">Status Izin</h4>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={permissionsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e2e3" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#434653' }} />
                <YAxis tick={{ fontSize: 10, fill: '#434653' }} />
                <Tooltip contentStyle={{ backgroundColor: '#faf9fa', borderColor: '#c3c6d5' }} />
                <Bar dataKey="count" fill="#094cb2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
