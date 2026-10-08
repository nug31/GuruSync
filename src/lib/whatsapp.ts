import type { Teacher } from '../types';

export const normalizePhone = (raw: string) => {
  let p = raw.replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (!p.startsWith('62')) p = '62' + p;
  return p;
};

export const getSapaan = (teacher: Teacher) => {
  const g = (teacher.gender || '').toLowerCase();
  return g.startsWith('p') ? 'Ibu' : g.startsWith('l') ? 'Bapak' : 'Bapak/Ibu';
};

export const buildWaUrl = (phone: string, lines: string[]) =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(lines.join('\n'))}`;
