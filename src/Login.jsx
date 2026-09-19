import { useState } from 'react';
import { login, getBase } from './api';

export default function Login({ onLoggedIn }) {
  const [baseUrl, setBaseUrl] = useState(getBase());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(baseUrl, email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink bg-[radial-gradient(circle_at_20%_20%,rgba(184,112,62,0.14),transparent_45%)] px-6">
      <div className="w-full max-w-[380px] rounded-xl border border-white/10 bg-ink-soft p-9">
        <div className="mb-1.5 font-display text-[15px] uppercase tracking-[0.08em] text-copper">Ledger</div>
        <h1 className="mb-7 font-display text-[26px] font-medium text-bone">Sign in</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/55">
              Backend URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-backend.up.railway.app"
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-[14px] text-bone placeholder:text-white/30 focus:border-copper focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/55">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@winkbrowbar.com"
              autoComplete="email"
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-[14px] text-bone placeholder:text-white/30 focus:border-copper focus:outline-none"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/55">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-[14px] text-bone placeholder:text-white/30 focus:border-copper focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-copper py-3 text-[14px] font-semibold text-[#1a1208] transition-[filter] hover:brightness-110 disabled:cursor-default disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="mt-3 text-[13px] text-[#e39289]">{error}</div>}
        </form>
      </div>
    </div>
  );
}
