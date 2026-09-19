import { getUser, clearSession } from './api';

const NAV_ITEMS = [
  // { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Dashboard' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'customers', label: 'Customers' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'team', label: 'Team', adminOnly: true },
];

export default function Sidebar({ page, onNavigate, onLoggedOut }) {
  const user = getUser();

  function handleLogout() {
    clearSession();
    onLoggedOut();
  }

  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col bg-ink px-4 py-6 text-bone max-[860px]:w-full max-[860px]:flex-row max-[860px]:items-center max-[860px]:gap-3 max-[860px]:overflow-x-auto max-[860px]:px-4 max-[860px]:py-3.5">
      <div className="mb-4 border-b border-white/10 px-2 pb-5 font-display text-[15px] uppercase tracking-[0.08em] text-copper max-[860px]:m-0 max-[860px]:border-none max-[860px]:p-0">
        Ledger
        <small className="mt-0.5 block font-body text-[11px] normal-case tracking-normal text-white/45 max-[860px]:hidden">
          Wink Brow Bar
        </small>
      </div>

      <nav className="flex flex-col gap-0.5 max-[860px]:flex-row">
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2.5 text-left text-[14px] font-medium transition-colors ${
              page === item.key ? 'bg-copper/[0.16] text-copper' : 'text-white/65 hover:bg-white/[0.06] hover:text-bone'
            }`}
          >
            <span className="h-[5px] w-[5px] rounded-full bg-current opacity-70" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4 max-[860px]:hidden">
        <div className="mb-2.5 text-[12px] leading-snug text-white/55">
          <strong className="block text-[13px] font-semibold text-bone">{user?.name || user?.email}</strong>
          {user?.email}
          <span className="mt-1 inline-block rounded bg-copper/[0.18] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-copper">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-md border border-white/[0.18] py-2 text-[12px] text-white/75 transition-colors hover:border-white/40 hover:text-bone"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}