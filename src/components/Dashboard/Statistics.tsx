import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Teacher, Permission } from '../../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { InfoKepsek } from './InfoKepsek';
import { Avatar } from './Avatar';
import { CampusFilter, type CampusFilterValue } from './CampusFilter';
import { TYPE_ICONS, TYPE_COLORS } from '../../lib/permissionTypes';

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

  const [campus, setCampus] = useState<CampusFilterValue>('semua');
  const canFilterCampus = ['admin', 'hod', 'koordinator_hod', 'wakasek', 'kepsek'].includes(profile?.role || '');

  const scopedTeachers = useMemo(
    () => (campus === 'semua' ? teachers : teachers.filter(t => t.campus === campus)),
    [teachers, campus]
  );
  const scopedPermissions = useMemo(() => {
    if (campus === 'semua') return permissions;
    const ids = new Set(scopedTeachers.map(t => t.id));
    return permissions.filter(p => ids.has(p.teacher_id));
  }, [permissions, scopedTeachers, campus]);

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      totalTeachers: scopedTeachers.length,
      activeToday: scopedPermissions.filter(p => p.status === 'approved' && p.start_date <= today && p.end_date >= today).length,
      pending: scopedPermissions.filter(p => p.status.startsWith('pending')).length,
    };
  }, [scopedTeachers, scopedPermissions]);

  const recentPermissions = useMemo(
    () => [...scopedPermissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [scopedPermissions]
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
    <div className="py-3 lg:py-8 space-y-5 lg:space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
          Selamat Datang, {userName}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1 capitalize">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </p>
      </div>

      {canFilterCampus && <CampusFilter value={campus} onChange={setCampus} />}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-3 sm:p-5 rounded-2xl border border-slate-200/80 bg-white">
            <p className="text-[11px] sm:text-xs font-semibold text-on-surface-variant leading-tight">{c.label}</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 sm:mt-2 ${c.highlight ? 'text-amber-600' : 'text-on-surface'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {(profile?.role === 'kepsek' || profile?.role === 'admin') && (
        <InfoKepsek teachers={teachers} permissions={scopedPermissions} isAdmin={profile.role === 'admin'} />
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar teacher={teacher} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{teacher?.name || 'Guru'}</p>
                      <p className="text-xs text-on-surface-variant truncate flex items-center gap-1">
                        <span className={`material-symbols-outlined text-[15px] ${TYPE_COLORS[p.permission_type]}`}>{TYPE_ICONS[p.permission_type]}</span>
                        {p.permission_type} · {format(new Date(p.start_date), 'd MMM', { locale: id })}
                        {p.end_date !== p.start_date && ` - ${format(new Date(p.end_date), 'd MMM yyyy', { locale: id })}`}
                      </p>
                    </div>
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
