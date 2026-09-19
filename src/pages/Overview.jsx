import { useState, useEffect, useCallback } from 'react';
import {
  getSummary,
  getCampaigns,
  getLocations,
  getCac,
  getRecentPurchases,
  getCenterList,
  getLocationReport,
} from '../api';
import {
  PlatformBadge,
  StatCard,
  EmptyState,
  SkeletonLines,
  SkeletonCards,
  ErrorBanner,
  DateRangeFilter,
  LocationFilter,
} from '../components';
import { money, platformMeta } from '../platforms';
import Ledger from '../Ledger';

export default function Overview() {
  const [range, setRange] = useState({ days: 30 });
  const [centers, setCenters] = useState([]);
  const [location, setLocation] = useState('all');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState(null);
  const [locations, setLocations] = useState([]);
  const [cac, setCac] = useState([]);

  const [campaigns, setCampaigns] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [locationReport, setLocationReport] = useState(null);

  useEffect(() => {
    getCenterList()
      .then((d) => setCenters(d.centers || []))
      .catch(() => setCenters([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, l, ca, c, rp, lr] = await Promise.all([
        getSummary(range),
        getLocations(range),
        getCac(range),
        getCampaigns(range, location),
        getRecentPurchases(15, location),
        getLocationReport(range, location),
      ]);
      setSummary(s);
      setLocations(l.locations || []);
      setCac(ca.cac || []);
      setCampaigns(c.campaigns || []);
      setRecentPurchases(rp.purchases || []);
      setLocationReport(lr);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, location]);

  useEffect(() => { load(); }, [load]);

  const isScoped = location !== 'all';
  const maxLocationRevenue = Math.max(1, ...locations.map((l) => l.revenue));

  // "Top Campaigns" should only rank real ad campaigns against each other -
  // Direct (walk-ins/untracked) and Klaviyo (fires on every purchase
  // regardless of source) aren't acquisition channels, so mixing them into
  // the same ranked list drowns out genuine campaign performance and makes
  // Klaviyo look like a competing channel instead of a parallel CRM sync.
  const adCampaigns = campaigns.filter((c) => c._id.platform !== 'direct' && c._id.platform !== 'klaviyo');
  const directCampaignRevenue = campaigns.filter((c) => c._id.platform === 'direct').reduce((sum, c) => sum + c.revenue, 0);
  const klaviyoCampaignRevenue = campaigns.filter((c) => c._id.platform === 'klaviyo').reduce((sum, c) => sum + c.revenue, 0);
  const maxCampaignRevenue = Math.max(1, ...adCampaigns.map((c) => c.revenue));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Wink Brow Bar</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Master Report</h1>
          <p className="mt-1 max-w-lg text-[12.5px] leading-snug text-ink/50">
            Everything in one place — company-wide totals or a single location, any date range.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DateRangeFilter value={range} onChange={setRange} showAll />
          <LocationFilter value={location} centers={centers} onChange={setLocation} />
        </div>
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      {loading ? (
        <>
          <div className="animate-shimmer mb-6 h-5 w-60 rounded-md" />
          <SkeletonCards count={5} />
        </>
      ) : (
        <>
          {isScoped ? (
            <div className="mb-7 flex flex-wrap items-baseline gap-7">
              <div className="font-display text-[56px] font-semibold leading-none tracking-tight text-ink">
                {money(locationReport?.totalRevenue)}
              </div>
              <div className="max-w-[260px] text-[13px] leading-snug text-ink/50">
                Revenue booked at <strong className="text-ink">{location}</strong>
                {range.all ? ' — all time' : range.startDate || range.endDate
                  ? ` between ${range.startDate || 'the start'} and ${range.endDate || 'today'}`
                  : ` in the last ${range.days} days`}
                , across {locationReport?.totalInvoices ?? 0} invoices.
              </div>
            </div>
          ) : summary ? (
            <>
          <Ledger byPlatform={summary.byPlatform} unattributedRevenue={summary.unattributedRevenue} />
              <div className="mb-7 flex flex-wrap items-baseline gap-7">
                <div>
                  <div className="font-display text-[56px] font-semibold leading-none tracking-tight text-ink">
                    {money(summary.totalRevenue)}
                  </div>
                  <div className="mt-1 text-[12.5px] text-ink/40">
                    {money(summary.totalRevenueExTax)} excl. tax · {money(summary.totalTax)} tax
                  </div>
                </div>
                <div className="max-w-[220px] text-[13px] leading-snug text-ink/50">
                  Company-wide revenue, all locations combined, across {summary.totalInvoices} invoices.
                </div>
              </div>
            </>
          ) : null}

          {isScoped && (
            <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Invoices" value={locationReport?.totalInvoices ?? 0} />
              <StatCard label="Avg Order Value" value={money(locationReport?.avgOrderValue)} />
              <StatCard
                label="Share of Company Revenue"
                value={
                  summary?.totalRevenue
                    ? `${((locationReport?.totalRevenue / summary.totalRevenue) * 100).toFixed(1)}%`
                    : '—'
                }
              />
            </div>
          )}

          {summary && (
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <StatCard label="New Customers" value={summary.newCustomers} sub="company-wide" />
              <StatCard label="Returning Customers" value={summary.returningCustomers} sub="company-wide" />
              <StatCard
                label="Retention"
                value={`${summary.retentionRate ?? 0}%`}
                sub={`${summary.repeatCustomers ?? 0} of ${summary.totalCustomersAllTime ?? 0}, all-time`}
              />
              <StatCard label="Tracked Visits" value={summary.totalVisits} sub="company-wide" />
              <StatCard label="Ad-Attributed Revenue" value={money(summary.adAttributedRevenue)} sub="Meta + Google + AWIN only" />
              <StatCard label="Direct / Organic Revenue" value={money(summary.directRevenue)} sub="walk-ins & untracked" />
              <StatCard label="Unattributed Revenue" value={money(summary.unattributedRevenue)} sub="no conversion at all" />
            </div>
          )}
          {isScoped && (
            <p className="-mt-5 mb-8 text-[11.5px] text-ink/40">
              New/returning customers, retention, tracked visits, and CAC aren't split by
              location — a customer or a click isn't tied to a single studio in how they're
              tracked, so those six numbers above are always company-wide, even while
              scoped to {location}.
            </p>
          )}

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-medium text-ink">Revenue by Platform</h2>
              <span className="text-[12px] text-ink/45">{isScoped ? location : 'all locations'} · sent conversions only</span>
            </div>
            {(isScoped ? locationReport?.byPlatform : summary?.byPlatform)?.length ? (
              <>
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                      <th className="pb-2.5">Platform</th>
                      <th className="pb-2.5 text-right">Conversions</th>
                      <th className="pb-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isScoped ? locationReport.byPlatform : summary.byPlatform)
                      .filter((p) => p._id !== 'klaviyo')
                      .map((p) => (
                        <tr key={p._id} className="border-b border-ink/10 last:border-none">
                          <td className="py-2.5"><PlatformBadge platform={p._id} /></td>
                          <td className="py-2.5 text-right font-mono">{p.conversions}</td>
                          <td className="py-2.5 text-right font-mono">{money(p.revenue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {(isScoped ? locationReport.byPlatform : summary.byPlatform)
                  .filter((p) => p._id === 'klaviyo')
                  .map((p) => (
                    <div key={p._id} className="mt-4 flex items-center justify-between border-t border-dashed border-ink/10 pt-4 text-[12.5px]">
                      <div>
                        <PlatformBadge platform="klaviyo" />
                        <span className="ml-2 text-ink/50">
                          synced for email/CRM — not a separate acquisition channel, overlaps with the rows above
                        </span>
                      </div>
                      <span className="font-mono text-ink/60">{p.conversions} purchases · {money(p.revenue)}</span>
                    </div>
                  ))}
              </>
            ) : (
              <EmptyState text="No attributed conversions in this window yet." />
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
                      <tr
                        key={l._id}
                        onClick={() => setLocation(l._id)}
                        className={`cursor-pointer border-b border-ink/10 last:border-none hover:bg-ink/[0.03] ${
                          location === l._id ? 'bg-copper/[0.08]' : ''
                        }`}
                      >
                        <td className="py-2.5 font-medium text-ink">{l._id}</td>
                        <td className="py-2.5 text-right font-mono">{l.conversions}</td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-[70px] overflow-hidden rounded-full bg-ink/10">
                              <div
                                className="h-full rounded-full bg-copper"
                                style={{ width: `${(l.revenue / maxLocationRevenue) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono">{money(l.revenue)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-[11px] text-ink/40">Click a row to scope the whole page to that location.</p>
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-medium text-ink">Cost per Customer Acquired</h2>
                <span className="text-[12px] text-ink/45">by platform · company-wide</span>
              </div>
              {cac.length === 0 ? (
                <EmptyState text="No ad spend synced for this window yet." />
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
              <span className="text-[12px] text-ink/45">{isScoped ? location : 'all locations'} · by revenue</span>
            </div>
            {adCampaigns.length === 0 ? (
              <EmptyState text="No ad-campaign-attributed revenue in this window yet." />
            ) : (
              <>
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                      <th className="pb-2.5">Campaign</th>
                      <th className="pb-2.5">Platform</th>
                      <th className="pb-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adCampaigns.slice(0, 10).map((c, i) => {
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
                <div className="mt-4 space-y-2 border-t border-dashed border-ink/10 pt-4 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <PlatformBadge platform="direct" />
                      <span className="ml-2 text-ink/50">walk-ins & untracked — not a campaign</span>
                    </div>
                    <span className="font-mono text-ink/60">{money(directCampaignRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <PlatformBadge platform="klaviyo" />
                      <span className="ml-2 text-ink/50">synced for email/CRM — overlaps with rows above</span>
                    </div>
                    <span className="font-mono text-ink/60">{money(klaviyoCampaignRevenue)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-medium text-ink">Recent Purchases</h2>
              <span className="text-[12px] text-ink/45">{isScoped ? location : 'all locations'} · latest 15</span>
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
      )}
    </>
  );
}