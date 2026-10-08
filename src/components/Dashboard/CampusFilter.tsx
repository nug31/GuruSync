import type { Campus } from '../../types';
import { CAMPUS_SHORT_LABELS } from '../../lib/campuses';

export type CampusFilterValue = 'semua' | Campus;

const OPTIONS: { value: CampusFilterValue; label: string }[] = [
  { value: 'semua', label: 'Semua Kampus' },
  ...(Object.keys(CAMPUS_SHORT_LABELS) as Campus[]).map(c => ({ value: c, label: CAMPUS_SHORT_LABELS[c] })),
];

interface CampusFilterProps {
  value: CampusFilterValue;
  onChange: (value: CampusFilterValue) => void;
}

export function CampusFilter({ value, onChange }: CampusFilterProps) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1 max-w-full overflow-x-auto">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
