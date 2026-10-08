import type { Campus } from '../types';

export const CAMPUS_OPTIONS: { value: Campus; label: string }[] = [
  { value: 'utama', label: 'Kampus Utama (MM2100)' },
  { value: 'kampus_02', label: 'Kampus 02 (Pati)' },
  { value: 'kampus_03', label: 'Kampus 03' },
  { value: 'asysyarif', label: 'Asy-Syarif (Mojokerto)' },
];

export const CAMPUS_SHORT_LABELS: Record<Campus, string> = {
  utama: 'Kampus Utama',
  kampus_02: 'Kampus 02 Pati',
  kampus_03: 'Kampus 03',
  asysyarif: 'Asy-Syarif Mojokerto',
};
