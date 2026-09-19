import { useState, useEffect } from 'react';
import { listUsers, createUser, deactivateUser, getUser } from '../api';
import { EmptyState, SkeletonLines, ErrorBanner } from '../components';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');

  const currentUser = getUser();

  async function load() {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await createUser({ brandId: currentUser.brandId, email, name, password, role });
      setEmail(''); setName(''); setPassword(''); setRole('viewer');
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this user? They will no longer be able to sign in.')) return;
    try {
      await deactivateUser(id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  const inputClass =
    'w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-ink/35 focus:border-copper focus:outline-none';

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Access</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Team</h1>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-medium text-ink">Invite a teammate</h2>
          <span className="text-[12px] text-ink/45">Admins manage users · Viewers see the dashboard only</span>
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@winkbrowbar.com"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-bone transition-[filter] hover:brightness-125 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </form>
        {formError && <div className="mt-4"><ErrorBanner>{formError}</ErrorBanner></div>}
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-medium text-ink">Everyone with access</h2>
          <span className="text-[12px] text-ink/45">{users.length} user{users.length === 1 ? '' : 's'}</span>
        </div>
        {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}
        {loading ? (
          <SkeletonLines count={4} />
        ) : users.length === 0 ? (
          <EmptyState text="No users yet." />
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                <th className="pb-2.5">Name</th>
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">Role</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-ink/10 last:border-none">
                  <td className="py-2.5 font-medium text-ink">{u.name || '—'}</td>
                  <td className="py-2.5 text-ink/70">{u.email}</td>
                  <td className="py-2.5 capitalize text-ink/70">{u.role}</td>
                  <td className="py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${u.isActive ? 'bg-sage-soft text-sage' : 'bg-ink/5 text-ink/40'}`}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {u.isActive && u._id !== currentUser.id && (
                      <button onClick={() => handleDeactivate(u._id)} className="text-[12.5px] font-semibold text-rose hover:underline">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
