import type { Teacher } from '../../types';

export function Avatar({ teacher }: { teacher?: Teacher }) {
  if (teacher?.avatar_url) {
    return <img src={teacher.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-bold shrink-0">
      {teacher?.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
