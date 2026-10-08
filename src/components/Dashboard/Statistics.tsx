import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Teacher, Permission } from '../../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { InfoKepsek } from './InfoKepsek';

interface StatisticsProps {
  teachers: Teacher[];
  permissions: Permission[];
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  pending_hod: { label: 'Menunggu HOD', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_wakasek: { label: 'Menunggu Wakasek', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_kepsek: { label: 'Menunggu Kepsek', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function Statistics({ teachers, permissions }: StatisticsProps) {
  const { user, profile } = useAuth();

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      totalTeachers: teachers.length,
      activeToday: permissions.filter(p => p.status === 'approved' && p.start_date <= today && p.end_date >= today).length,
      pending: permissions.filter(p => p.status.startsWith('pending')).length,
    };
  }, [teachers, permissions]);

  const recentPermissions = useMemo(
    () => [...permissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [permissions]
  );

  const userName = profile?.role === 'admin'
    ? 'Admin'
    : teachers.find(t => t.user_id === user?.id)?.name || profile?.name || profile?.email || 'User';

  const cards = [
    { label: 'Total Guru', value: stats.totalTeachers },
    { label: 'Izin / Tugas Luar Hari Ini', value: stats.activeToday },
    { label: 'Menunggu Persetujuan', value: stats.pending, highlight: stats.pending > 0 },
  ];

  return (
    <div className="py-6 lg:py-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
          Selamat Datang, {userName}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1 capitalize">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-5 rounded-2xl border border-slate-200/80 bg-white">
            <p className="text-xs font-semibold text-on-surface-variant">{c.label}</p>
            <p className={`text-3xl font-extrabold mt-2 ${c.highlight ? 'text-amber-600' : 'text-on-surface'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {(profile?.role === 'kepsek' || profile?.role === 'admin') && (
        <InfoKepsek teachers={teachers} permissions={permissions} isAdmin={profile.role === 'admin'} />
      )}

      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6">
        <h3 className="text-base font-bold text-on-surface mb-2">Pengajuan Terbaru</h3>
        {recentPermissions.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant italic">Belum ada pengajuan izin.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentPermissions.map(p => {
              const teacher = teachers.find(t => t.id === p.teacher_id);
              const badge = STATUS_BADGES[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{teacher?.name || 'Guru'}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {p.permission_type} · {format(new Date(p.start_date), 'd MMM', { locale: id })}
                      {p.end_date !== p.start_date && ` - ${format(new Date(p.end_date), 'd MMM yyyy', { locale: id })}`}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border whitespace-nowrap ${badge.cls}`}>
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
