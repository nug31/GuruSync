import { useMemo, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Teacher, Permission, PermissionType } from '../../types';

interface MonitoringHarianProps {
  teachers: Teacher[];
  permissions: Permission[];
}

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

const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
const isActiveOn = (p: Permission, dateStr: string) => p.start_date <= dateStr && p.end_date >= dateStr;

export function MonitoringHarian({ teachers, permissions }: MonitoringHarianProps) {
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const todayStr = toDateStr(new Date());

  const shiftDate = (delta: number) => {
    setSelectedDate(toDateStr(addDays(parseISO(selectedDate), delta)));
  };

  const approvedToday = useMemo(
    () => permissions.filter(p => p.status === 'approved' && isActiveOn(p, selectedDate)),
    [permissions, selectedDate]
  );

  const pendingToday = useMemo(
    () => permissions.filter(p => p.status.startsWith('pending') && isActiveOn(p, selectedDate)),
    [permissions, selectedDate]
  );

  const approvedTeacherIds = useMemo(() => new Set(approvedToday.map(p => p.teacher_id)), [approvedToday]);
  const totalGuru = teachers.length;
  const hadirCount = Math.max(totalGuru - approvedTeacherIds.size, 0);

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    approvedToday.forEach(p => { map[p.permission_type] = (map[p.permission_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [approvedToday]);

  const trend = useMemo(() => {
    const base = parseISO(selectedDate);
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(base, i - 13);
      const ds = toDateStr(d);
      const count = new Set(
        permissions.filter(p => p.status === 'approved' && isActiveOn(p, ds)).map(p => p.teacher_id)
      ).size;
      return { date: ds, label: format(d, 'd/M'), count };
    });
  }, [permissions, selectedDate]);

  const getTeacher = (teacherId: string) => teachers.find(t => t.id === teacherId);
  const displayDateLabel = format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: localeId });
  const isViewingToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* Header + Date Nav */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2 border-b border-outline-variant/30 pb-8">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant/70 font-label text-[10px] mb-4">
            <span>Guru</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Monitoring Harian</span>
          </nav>
          <h1 className="text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">Monitoring Harian</h1>
          <p className="text-lg text-on-surface-variant/80 italic font-headline">
            Pantau siapa saja yang sedang izin, sakit, atau tugas luar per hari.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2 shadow-sm shrink-0">
          <button
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
            title="Hari sebelumnya"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <div className="px-3 text-center min-w-[110px]">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-on-surface text-center outline-none w-full"
            />
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
            title="Hari berikutnya"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          {!isViewingToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="ml-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors whitespace-nowrap"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-bold text-on-surface-variant -mt-4 capitalize">{displayDateLabel}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
          <p className="text-on-surface-variant/60 font-label text-[10px] uppercase tracking-widest mb-3">Total Guru</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-headline font-bold text-on-surface">{String(totalGuru).padStart(2, '0')}</span>
            <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">groups</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
          <p className="text-on-surface-variant/60 font-label text-[10px] uppercase tracking-widest mb-3">Hadir</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-headline font-bold text-success">{String(hadirCount).padStart(2, '0')}</span>
            <div className="w-9 h-9 rounded-full bg-success-container/40 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
          <p className="text-on-surface-variant/60 font-label text-[10px] uppercase tracking-widest mb-3">Tidak Hadir (Izin)</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-headline font-bold text-error">{String(approvedTeacherIds.size).padStart(2, '0')}</span>
            <div className="w-9 h-9 rounded-full bg-error-container/40 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[18px]">event_busy</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
          <p className="text-on-surface-variant/60 font-label text-[10px] uppercase tracking-widest mb-3">Menunggu Persetujuan</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-headline font-bold text-tertiary">{String(pendingToday.length).padStart(2, '0')}</span>
            <div className="w-9 h-9 rounded-full bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Type breakdown chips */}
      {typeBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeBreakdown.map(([type, count]) => (
            <span key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-[14px] text-primary">{TYPE_ICONS[type as PermissionType] || 'event_busy'}</span>
              {type} <span className="text-on-surface-variant">· {count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Trend chart */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Tren 14 Hari Terakhir</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">Klik salah satu batang untuk lompat ke tanggal itu</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} onClick={(e: any) => { if (e?.activeLabel) { const p = trend.find(t => t.label === e.activeLabel); if (p) setSelectedDate(p.date); } }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#47556910' }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                labelFormatter={(label) => `Tanggal ${label}`}
                formatter={(value) => [`${value} guru`, 'Izin']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} cursor="pointer">
                {trend.map(t => (
                  <Cell key={t.date} fill={t.date === selectedDate ? '#B45309' : '#475569'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Approved today list */}
      <div>
        <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-error">event_busy</span>
          Sedang Izin / Tidak Hadir
          <span className="text-sm font-normal text-on-surface-variant">({approvedToday.length})</span>
        </h3>
        {approvedToday.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant/60 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
            <span className="material-symbols-outlined text-4xl mb-2 block">celebration</span>
            <p className="font-serif italic">Semua guru hadir pada tanggal ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {approvedToday.map(p => {
              const teacher = getTeacher(p.teacher_id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm">
                  {teacher?.avatar_url ? (
                    <img src={teacher.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-surface-container-high shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-on-surface truncate">{teacher?.name || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant truncate">{teacher?.subject || '-'}</p>
                  </div>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container/30 text-error text-[10px] font-bold uppercase tracking-wide shrink-0">
                    <span className="material-symbols-outlined text-[13px]">{TYPE_ICONS[p.permission_type] || 'event_busy'}</span>
                    {p.permission_type}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending today list */}
      {pendingToday.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">pending_actions</span>
            Menunggu Persetujuan (mencakup tanggal ini)
            <span className="text-sm font-normal text-on-surface-variant">({pendingToday.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendingToday.map(p => {
              const teacher = getTeacher(p.teacher_id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 shadow-sm opacity-90">
                  {teacher?.avatar_url ? (
                    <img src={teacher.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-surface-container-high shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-on-surface truncate">{teacher?.name || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant truncate">{p.permission_type}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-wide shrink-0">
                    Menunggu
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
