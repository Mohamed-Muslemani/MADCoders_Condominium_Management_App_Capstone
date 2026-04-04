import { useState, type FormEvent } from 'react';
import './login.css';

interface LoginFormProps {
  loading?: boolean;
  error?: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
}

export function LoginForm({ loading, error, onSubmit }: LoginFormProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);


  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSubmit({ email, password });
  }

  return (
    /* ── Page ─────────────────────────────────────────────────────────── */
    <div className="relative min-h-screen grid place-items-center p-6 overflow-hidden bg-[#f5f7fb] text-[#0f172a] [font-family:ui-sans-serif,system-ui,-apple-system,'Segoe_UI',Roboto,Helvetica,Arial]">

      {/* Blob 1 */}
      <div className="blob-1 pointer-events-none fixed rounded-full z-0 w-[520px] h-[520px] -top-[220px] -left-[210px] opacity-65 [filter:blur(10px)] [background:radial-gradient(circle_at_30%_30%,rgba(37,99,235,.22),rgba(7,26,51,.06),transparent_72%)]" />

      {/* Blob 2 */}
      <div className="blob-2 pointer-events-none fixed rounded-full z-0 w-[620px] h-[620px] -bottom-[320px] -right-[320px] opacity-55 [filter:blur(10px)] [background:radial-gradient(circle_at_40%_35%,rgba(11,43,85,.22),rgba(37,99,235,.08),transparent_72%)]" />

      {/* Blueprint lines */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-55 [background:linear-gradient(to_bottom,rgba(11,43,85,.06)_1px,transparent_1px)] [background-size:100%_46px] [transform:rotate(-1.2deg)]" />

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <main className="card-accent relative z-10 overflow-hidden w-[min(420px,100%)] bg-white rounded-[26px] p-[18px] border border-[#e5eaf3] [box-shadow:0_18px_50px_rgba(15,23,42,.12)]">

        {/* Corner decoration */}
        <div className="absolute pointer-events-none z-0 w-[140px] h-[140px] rounded-[36px] -top-[44px] -right-[44px] rotate-[14deg] border border-[rgba(37,99,235,.18)] [background:radial-gradient(circle_at_30%_30%,rgba(37,99,235,.10),transparent_70%)]" />

        {/* ── Brand row ── */}
        <div className="flex items-center justify-between gap-3 mt-[6px]">
          <div className="flex items-center gap-3">

            {/* Logo */}
            <div className="flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-[16px] border border-[#e5eaf3] bg-white p-[5px] shadow-[0_10px_24px_rgba(15,23,42,.08)]">
  <img
    src="/CMLogo.png"
    alt="CondoManager logo"
    className="w-full h-full object-cover"
  />
</div>

            <div>
              <strong className="block text-[14px] font-bold tracking-[-0.01em] text-[#0f172a]">
                CondoManager
              </strong>
              <span className="block text-[12px] text-[#64748b] mt-[2px]">
                Building Portal
              </span>
            </div>
          </div>

          {/* Secure pill */}
          <div className="inline-flex items-center gap-2 select-none whitespace-nowrap px-[10px] py-[8px] rounded-full border border-[#e5eaf3] bg-white text-[#64748b] text-[12px]">
            🔒 Secure
          </div>
        </div>

        {/* ── Heading ── */}
        <h1 className="mt-[14px] mb-[4px] text-[20px] font-bold tracking-[-0.03em] text-[#0f172a]">
          Sign in
        </h1>
        <p className="mt-0 mb-[14px] text-[13px] text-[#64748b] leading-[1.55]">
          Welcome back. Please enter your credentials to continue.
        </p>

        <form onSubmit={handleSubmit}>

          {/* ── Email ── */}
          <label htmlFor="email" className="block text-[12px] text-[#64748b] mt-[10px] mb-[6px]">
            Email
          </label>
          <div className="condo-field flex items-center gap-[10px] border border-[#e5eaf3] rounded-[16px] px-[12px] py-[10px] bg-white transition-[border-color,box-shadow] duration-150">
            <span className="select-none opacity-85">📧</span>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="condo-input w-full border-0 outline-none text-[14px] bg-transparent text-[#0f172a]"
            />
          </div>

          {/* ── Password ── */}
          <label htmlFor="password" className="block text-[12px] text-[#64748b] mt-[10px] mb-[6px]">
            Password
          </label>
          <div className="condo-field flex items-center gap-[10px] border border-[#e5eaf3] rounded-[16px] px-[12px] py-[10px] bg-white transition-[border-color,box-shadow] duration-150">
            <span className="select-none opacity-85">🔒</span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="condo-input w-full border-0 outline-none text-[14px] bg-transparent text-[#0f172a]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="select-none whitespace-nowrap cursor-pointer border border-[#e5eaf3] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] text-[12px] px-[10px] py-[6px] rounded-full transition-colors duration-150"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {/* ── Error ── */}
          {error && (
            <p className="mt-[10px] text-[13px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-[12px] px-[12px] py-[8px]">
              {error}
            </p>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
         className="btn-shine relative mt-[14px] flex w-full items-center justify-center gap-[10px] overflow-hidden rounded-[16px] border-0 bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-[14px] py-[12px] text-[14px] font-black !text-white transition-[filter,transform] duration-150 hover:brightness-[1.03] active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          {/* ── Help ── */}
          <div className="mt-[12px] border-t border-dashed border-[#e5eaf3] pt-[12px] text-[12px] leading-[1.5] text-[#64748b]">
  Need access?{' '}
  <a
    href="#"
    onClick={(e) => e.preventDefault()}
    className="text-[12px] font-[900] text-[#1d4ed8] no-underline hover:underline"
  >
    Contact administrator
  </a>
</div>


        </form>
      </main>
    </div>
  );
}
