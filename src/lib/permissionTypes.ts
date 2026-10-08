import type { PermissionType } from '../types';

export const TYPE_ICONS: Record<PermissionType, string> = {
  'Sakit': 'medical_services',
  'Cuti': 'flight_takeoff',
  'Tugas Luar': 'work_history',
  'Izin Keluar & Kembali': 'transfer_within_a_station',
  'Tidak Masuk': 'person_off',
  'Terlambat': 'schedule',
  'Pulang Cepat': 'logout',
};

export const TYPE_COLORS: Record<PermissionType, string> = {
  'Sakit': 'text-error',
  'Cuti': 'text-primary',
  'Tugas Luar': 'text-tertiary',
  'Izin Keluar & Kembali': 'text-secondary',
  'Tidak Masuk': 'text-on-surface-variant',
  'Terlambat': 'text-error',
  'Pulang Cepat': 'text-secondary',
};
