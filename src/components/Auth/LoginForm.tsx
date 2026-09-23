import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Kembali ke tujuan asli kalau login dipicu dari link notifikasi (mis. WA ?izin=...)
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-inverse-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-tertiary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-primary-hover to-slate-950 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07] flex items-center justify-center">
            <span className="material-symbols-outlined text-[380px]">qr_code_2</span>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight">GuruSync</span>
          </div>
          <div className="relative z-10 space-y-3">
            <p className="font-label text-[11px] uppercase tracking-[0.2em] text-tertiary-fixed-dim font-bold">Portal Kepegawaian Guru</p>
            <h2 className="font-display text-3xl font-extrabold leading-tight">
              Satu QR untuk<br />profil &amp; pengajuan izin guru.
            </h2>
            <p className="text-sm text-white/70 max-w-xs">
              Kelola data diri, tugas luar, izin, sakit, terlambat, hingga cuti dalam satu portal terverifikasi.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-surface p-8 sm:p-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
            <span className="font-display text-xl font-extrabold text-on-surface">GuruSync</span>
          </div>

          <h1 className="text-2xl font-display font-extrabold text-on-surface mb-1">
            Selamat Datang
          </h1>
          <p className="text-on-surface-variant text-sm mb-8">
            Masuk untuk mengakses portal kepegawaian Anda.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                NIK, Email, atau Tanggal Lahir
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow text-sm"
                placeholder="NIK / Email / Tgl Lahir (DDMMYY)"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
