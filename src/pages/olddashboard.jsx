import { useState, useEffect, useCallback } from 'react';
import { getSummary, getCampaigns, getLocations, getCac, getRecentPurchases } from '../api';
import { PlatformBadge, StatCard, EmptyState, SkeletonLines, SkeletonCards, ErrorBanner, DateRangeFilter } from '../components';
import { money, platformMeta } from '../platforms';
import Ledger from '../Ledger';

export default function Overview() {
  const [range, setRange] = useState({ days: 30 });
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [locations, setLocations] = useState([]);
  const [cac, setCac] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentPurchases, setRecentPurchases] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
const [s, c, l, ca, rp] = await Promise.all([
  getSummary(range),
  getCampaigns(range),
  getLocations(range),
  getCac(range),
  getRecentPurchases(10),
]);
setSummary(s);
setCampaigns(c.campaigns || []);
setLocations(l.locations || []);
setCac(ca.cac || []);
setRecentPurchases(rp.purchases || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const maxCampaignRevenue = Math.max(1, ...campaigns.map((c) => c.revenue));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Wink Brow Bar</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Overview</h1>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      {loading ? (
        <>
          <div className="animate-shimmer mb-6 h-5 w-60 rounded-md" />
          <SkeletonCards count={5} />
        </>
      ) : summary ? (
        <>
          <Ledger byPlatform={summary.byPlatform} unattributedRevenue={summary.unattributedRevenue} />

          <div className="mb-7 flex flex-wrap items-baseline gap-7">
            <div className="font-display text-[56px] font-semibold leading-none tracking-tight text-ink">
              {money(summary.totalRevenue)}
            </div>
            <div className="max-w-[220px] text-[13px] leading-snug text-ink/50">
              Total revenue booked in the last {summary.windowDays} days, across {summary.totalInvoices} invoices.
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <StatCard label="Avg Order Value" value={money(summary.avgOrderValue)} />
            <StatCard label="Attributed Revenue" value={money(summary.attributedRevenue)} sub="tied to a tracked source" />
            <StatCard label="Unattributed Revenue" value={money(summary.unattributedRevenue)} sub="no tracked source found" />
            <StatCard label="New Customers" value={summary.newCustomers} />
            <StatCard label="Returning Customers" value={summary.returningCustomers} />
            <StatCard
              label="Retention"
              value={`${summary.retentionRate ?? 0}%`}
              sub={`${summary.repeatCustomers ?? 0} of ${summary.totalCustomersAllTime ?? 0} customers, all-time`}
            />
            <StatCard label="Tracked Visits" value={summary.totalVisits} />
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-medium text-ink">Revenue by Platform</h2>
              <span className="text-[12px] text-ink/45">sent conversions only</span>
            </div>
            {summary.byPlatform.length === 0 ? (
              <EmptyState text="No attributed conversions yet. Once a tracked click leads to a paid booking, it'll show up here." />
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="pb-2.5">Platform</th>
                    <th className="pb-2.5 text-right">Conversions</th>
                    <th className="pb-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPlatform.map((p) => (
                    <tr key={p._id} className="border-b border-ink/10 last:border-none">
                      <td className="py-2.5"><PlatformBadge platform={p._id} /></td>
                      <td className="py-2.5 text-right font-mono">{p.conversions}</td>
                      <td className="py-2.5 text-right font-mono">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {summary.byPlatform.some((p) => p._id === 'klaviyo') && (
              <p className="mt-3 text-[11.5px] text-ink/45">
                Klaviyo fires on every sale regardless of source, so it isn't a separate revenue
                channel — it's excluded from Total/Attributed Revenue and the Ledger above to
                avoid double-counting, but shown here for delivery visibility.
              </p>
            )}
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-medium text-ink">Revenue by Location</h2>
                <span className="text-[12px] text-ink/45">closed invoices</span>
              </div>
              {locations.length === 0 ? (
                <EmptyState text="No location data yet. This fills in once invoices start reporting a Zenoti center." />
              ) : (
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                      <th className="pb-2.5">Location</th>
                      <th className="pb-2.5 text-right">Invoices</th>
                      <th className="pb-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((l) => (
                      <tr key={l._id} className="border-b border-ink/10 last:border-none">
                        <td className="py-2.5 font-medium text-ink">{l._id}</td>
                        <td className="py-2.5 text-right font-mono">{l.conversions}</td>
                        <td className="py-2.5 text-right font-mono">{money(l.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-medium text-ink">Cost per Customer Acquired</h2>
                <span className="text-[12px] text-ink/45">by platform</span>
              </div>
              {cac.length === 0 ? (
                <EmptyState text="No ad spend synced for this window yet. Run the ad-spend sync and connect Meta/Google credentials to see CAC." />
              ) : (
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                      <th className="pb-2.5">Platform</th>
                      <th className="pb-2.5 text-right">Spend</th>
                      <th className="pb-2.5 text-right">New Customers</th>
                      <th className="pb-2.5 text-right">CAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cac.map((row) => (
                      <tr key={row.platform} className="border-b border-ink/10 last:border-none">
                        <td className="py-2.5"><PlatformBadge platform={row.platform} /></td>
                        <td className="py-2.5 text-right font-mono">{money(row.spend)}</td>
                        <td className="py-2.5 text-right font-mono">{row.newCustomers}</td>
                        <td className="py-2.5 text-right font-mono">{row.cac === null ? '—' : money(row.cac)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-medium text-ink">Top Campaigns</h2>
              <span className="text-[12px] text-ink/45">by revenue</span>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState text="No campaign-attributed revenue in this window yet." />
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="pb-2.5">Campaign</th>
                    <th className="pb-2.5">Platform</th>
                    <th className="pb-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 8).map((c, i) => {
                    const meta = platformMeta(c._id.platform);
                    return (
                      <tr key={i} className="border-b border-ink/10 last:border-none">
                        <td className="py-2.5">{c._id.campaign}</td>
                        <td className="py-2.5"><PlatformBadge platform={c._id.platform} /></td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-[90px] overflow-hidden rounded-full bg-ink/10">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(c.revenue / maxCampaignRevenue) * 100}%`, background: meta.color }}
                              />
                            </div>
                            <span className="font-mono">{money(c.revenue)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
      <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="font-display text-[17px] font-medium text-ink">Recent Purchases</h2>
    <span className="text-[12px] text-ink/45">latest 10</span>
  </div>
  {recentPurchases.length === 0 ? (
    <EmptyState text="No purchases yet." />
  ) : (
    <table className="w-full border-collapse text-[13.5px]">
      <thead>
        <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
          <th className="pb-2.5">Customer</th>
          <th className="pb-2.5">Platform</th>
          <th className="pb-2.5">Location</th>
          <th className="pb-2.5 text-right">Amount</th>
          <th className="pb-2.5 text-right">When</th>
        </tr>
      </thead>
      <tbody>
        {recentPurchases.map((p) => (
          <tr key={p._id} className="border-b border-ink/10 last:border-none">
            <td className="py-2.5 font-medium text-ink">{p.customerName || p.customerEmail || 'Unknown'}</td>
            <td className="py-2.5"><PlatformBadge platform={p.platform} /></td>
            <td className="py-2.5 text-ink/70">{p.centerName || '—'}</td>
            <td className="py-2.5 text-right font-mono">{money(p.amount)}</td>
            <td className="py-2.5 text-right text-ink/50">
              {new Date(p.closedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
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