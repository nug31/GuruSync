import { useMemo } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Teacher, Permission } from '../../types';
import { getSapaan, buildWaUrl } from '../../lib/whatsapp';
import { Avatar } from './Avatar';

interface InfoKepsekProps {
  teachers: Teacher[];
  permissions: Permission[];
  isAdmin: boolean;
}

const UPCOMING_DAYS = 7;

const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

const formatPeriode = (p: Permission) =>
  p.start_date === p.end_date
    ? format(parseISO(p.start_date), 'd MMM yyyy', { locale: id })
    : `${format(parseISO(p.start_date), 'd MMM', { locale: id })} - ${format(parseISO(p.end_date), 'd MMM yyyy', { locale: id })}`;

const formatJam = (p: Permission) =>
  p.start_time || p.end_time
    ? `${(p.start_time || '--:--').slice(0, 5)} - ${(p.end_time || '--:--').slice(0, 5)}`
    : '';

export function InfoKepsek({ teachers, permissions, isAdmin }: InfoKepsekProps) {
  const today = toDateStr(new Date());
  const limit = toDateStr(addDays(new Date(), UPCOMING_DAYS));

  const { sekarang, akanDatang } = useMemo(() => {
    const approved = permissions.filter(p => p.status === 'approved' && p.end_date >= today && p.start_date <= limit);
    const bySort = (a: Permission, b: Permission) => a.start_date.localeCompare(b.start_date);
    return {
      sekarang: approved.filter(p => p.start_date <= today).sort(bySort),
      akanDatang: approved.filter(p => p.start_date > today).sort(bySort),
    };
  }, [permissions, today, limit]);

  const kepsek = teachers.find(t => t.app_role === 'kepsek' && t.campus === 'utama');
  const kepsekPhone = kepsek ? (kepsek.wa_number || kepsek.phone) : '';

  const teacherName = (p: Permission) => teachers.find(t => t.id === p.teacher_id)?.name || 'Unknown';
  const teacherSubject = (p: Permission) => teachers.find(t => t.id === p.teacher_id)?.subject || '-';

  const buildWaInfoLink = () => {
    if (!kepsek) return null;
    const describe = (p: Permission, i: number) => {
      const parts = [`${i + 1}. ${teacherName(p)} (${teacherSubject(p)})`, `   ${p.permission_type} - ${formatPeriode(p)}`];
      const jam = formatJam(p);
      if (jam) parts.push(`   Jam: ${jam}`);
      if (p.permission_type === 'Tugas Luar' && p.tujuan_tugas_luar) parts.push(`   Tujuan: ${p.tujuan_tugas_luar}`);
      else if (p.reason) parts.push(`   Keterangan: ${p.reason}`);
      return parts.join('\n');
    };
    const section = (title: string, list: Permission[]) =>
      list.length ? ['', `*${title}*`, ...list.map(describe)] : [];

    const lines = [
      `*INFO IZIN & TUGAS LUAR - GuruSync*`,
      format(new Date(), 'EEEE, d MMMM yyyy', { locale: id }),
      ...section('Sedang berlangsung hari ini', sekarang),
      ...section(`Akan datang (${UPCOMING_DAYS} hari ke depan)`, akanDatang),
      ``,
      `Informasi untuk ${getSapaan(kepsek)} ${kepsek.name}. Detail lengkap: ${window.location.origin}/`,
    ];
    return buildWaUrl(kepsekPhone, lines);
  };

  const total = sekarang.length + akanDatang.length;
  const waLink = isAdmin && total > 0 && kepsekPhone ? buildWaInfoLink() : null;

  const renderRow = (p: Permission) => (
    <li key={p.id} className="flex items-start gap-3 py-3">
      <Avatar teacher={teachers.find(t => t.id === p.teacher_id)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-on-surface truncate">{teacherName(p)}</p>
        <p className="text-xs text-on-surface-variant truncate">
          {p.permission_type} · {formatPeriode(p)}{formatJam(p) ? ` · ${formatJam(p)}` : ''}
        </p>
        {(p.permission_type === 'Tugas Luar' ? p.tujuan_tugas_luar : p.reason) && (
          <p className="text-xs text-on-surface-variant/80 italic truncate">
            {p.permission_type === 'Tugas Luar' ? p.tujuan_tugas_luar : p.reason}
          </p>
        )}
      </div>
    </li>
  );

  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 mb-2">
        <div>
          <h3 className="text-xl font-bold text-on-surface">Info untuk Kepala Sekolah</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Tugas luar dan izin yang sudah disetujui, hari ini sampai {UPCOMING_DAYS} hari ke depan
          </p>
        </div>
        {isAdmin && (
          waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors font-bold text-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Kirim Info ke Kepala Sekolah
            </a>
          ) : (
            <span className="text-xs text-on-surface-variant/70 italic shrink-0">
              {total === 0 ? 'Tidak ada info untuk dikirim' : 'Nomor WA Kepala Sekolah belum diisi'}
            </span>
          )
        )}
      </div>

      {total === 0 ? (
        <p className="py-3 text-center text-sm text-on-surface-variant italic">
          Tidak ada tugas luar atau izin pada periode ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mt-3">
              Sedang berlangsung ({sekarang.length})
            </h4>
            {sekarang.length ? (
              <ul className="divide-y divide-slate-100">{sekarang.map(renderRow)}</ul>
            ) : (
              <p className="py-3 text-xs text-on-surface-variant/70 italic">Tidak ada.</p>
            )}
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mt-3">
              Akan datang ({akanDatang.length})
            </h4>
            {akanDatang.length ? (
              <ul className="divide-y divide-slate-100">{akanDatang.map(renderRow)}</ul>
            ) : (
              <p className="py-3 text-xs text-on-surface-variant/70 italic">Tidak ada.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
