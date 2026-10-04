import { platformMeta, money } from './platforms';

export default function Ledger({ byPlatform, unattributedRevenue }) {
  // Klaviyo fires on every closed invoice regardless of its real source
  // (see dashboardRoutes.js), so it's a duplicate of whatever the real
  // source already is - not a distinct slice of revenue. Including it here
  // would double-count that revenue and make the segments add up to more
  // than total revenue booked, so it's excluded from this "by source" view
  // (it still shows up in the Revenue by Platform table below, for
  // delivery-status visibility).
  const segments = [
    ...byPlatform.filter((p) => p._id !== 'klaviyo').map((p) => ({ key: p._id, amount: p.revenue })),
    ...(unattributedRevenue > 0 ? [{ key: 'unattributed', amount: unattributedRevenue }] : []),
  ];
  const total = segments.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="mb-7 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
      <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-wide text-ink/50">
        <span>Revenue Ledger — by source</span>
        {total > 0 && <span>{money(total)} total</span>}
      </div>
      <hr className="border-ink/10" />

      {total === 0 ? (
        <div className="py-4 text-[13px] text-ink/45">No revenue recorded in this window yet.</div>
      ) : (
        <>
          <div className="my-3 flex h-9 overflow-hidden rounded-md bg-ink/5">
            {segments.map((s) => {
              const meta = platformMeta(s.key);
              const pct = (s.amount / total) * 100;
              return (
                <div
                  key={s.key}
                  className="h-full min-w-[3px] transition-[filter] hover:brightness-90"
                  style={{ width: `${pct}%`, background: meta.color }}
                  title={`${meta.label}: ${money(s.amount)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <hr className="border-ink/10" />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {segments.map((s) => {
              const meta = platformMeta(s.key);
              const pct = ((s.amount / total) * 100).toFixed(1);
              return (
                <div key={s.key} className="flex items-center gap-1.5 text-[12px] text-ink/80">
                  <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: meta.color }} />
                  <span>{meta.label}</span>
                  <span className="font-mono text-ink/45">{money(s.amount)} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
