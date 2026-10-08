import { useMemo, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { Teacher, Permission } from '../../types';
import { Avatar } from './Avatar';
import { TYPE_ICONS, TYPE_COLORS } from '../../lib/permissionTypes';

interface MonitoringHarianProps {
  teachers: Teacher[];
  permissions: Permission[];
}

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

  // Tugas Luar dipisah dari izin/tidak hadir: guru tugas luar sedang bertugas (dinas), bukan absen.
  const tugasLuarToday = useMemo(() => approvedToday.filter(p => p.permission_type === 'Tugas Luar'), [approvedToday]);
  const absenToday = useMemo(() => approvedToday.filter(p => p.permission_type !== 'Tugas Luar'), [approvedToday]);

  const totalGuru = teachers.length;
  const hadirCount = Math.max(totalGuru - new Set(approvedToday.map(p => p.teacher_id)).size, 0);

  const getTeacher = (teacherId: string) => teachers.find(t => t.id === teacherId);
  const displayDateLabel = format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: localeId });

  const cards = [
    { label: 'Hadir', value: hadirCount, hint: `dari ${totalGuru} guru`, cls: 'text-emerald-600' },
    { label: 'Tugas Luar', value: tugasLuarToday.length, hint: 'sedang bertugas', cls: 'text-on-surface' },
    { label: 'Izin / Tidak Hadir', value: absenToday.length, hint: 'disetujui', cls: 'text-on-surface' },
    { label: 'Menunggu Persetujuan', value: pendingToday.length, hint: 'belum final', cls: pendingToday.length ? 'text-amber-600' : 'text-on-surface' },
  ];

  const renderSection = (title: string, list: Permission[], emptyText: string, detail: (p: Permission) => string, pending = false) => (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6">
      <h3 className="text-base font-bold text-on-surface mb-1">
        {title} <span className="font-normal text-on-surface-variant">({list.length})</span>
      </h3>
      {list.length === 0 ? (
        <p className="py-4 text-sm text-on-surface-variant italic">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map(p => {
            const teacher = getTeacher(p.teacher_id);
            return (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar teacher={teacher} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{teacher?.name || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant truncate">{detail(p)}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${
                  pending ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <span className={`material-symbols-outlined text-[14px] ${pending ? '' : TYPE_COLORS[p.permission_type]}`}>
                    {pending ? 'pending_actions' : TYPE_ICONS[p.permission_type]}
                  </span>
                  {pending ? 'Menunggu' : p.permission_type}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const timeOf = (p: Permission) =>
    p.start_time || p.end_time ? ` · ${(p.start_time || '--:--').slice(0, 5)} - ${(p.end_time || '--:--').slice(0, 5)}` : '';

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">Monitoring Harian</h1>
          <p className="text-sm text-on-surface-variant mt-1 capitalize">{displayDateLabel}</p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1.5 shrink-0">
          <button
            onClick={() => shiftDate(-1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Hari sebelumnya"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-on-surface text-center outline-none px-1"
          />
          <button
            onClick={() => shiftDate(1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Hari berikutnya"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="ml-1 px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors whitespace-nowrap"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white">
            <p className="text-xs font-semibold text-on-surface-variant">{c.label}</p>
            <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 sm:mt-2 ${c.cls}`}>{c.value}</p>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{c.hint}</p>
          </div>
        ))}
      </div>

      {tugasLuarToday.length > 0 &&
        renderSection('Sedang Tugas Luar', tugasLuarToday, '', p => `${p.tujuan_tugas_luar || getTeacher(p.teacher_id)?.subject || '-'}${timeOf(p)}`)}

      {renderSection(
        'Sedang Izin / Tidak Hadir',
        absenToday,
        'Semua guru hadir pada tanggal ini.',
        p => `${getTeacher(p.teacher_id)?.subject || '-'}${timeOf(p)}`
      )}

      {pendingToday.length > 0 &&
        renderSection('Menunggu Persetujuan', pendingToday, '', p => p.permission_type, true)}
    </div>
  );
}
