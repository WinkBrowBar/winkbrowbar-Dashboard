import { useState, useEffect, useCallback } from 'react';
import {
  getSummary,
  getLocationReport,
  getCampaigns,
  getTrend,
  getCenterList,
  previousRange,
} from '../api';
import {
  StatCard,
  EmptyState,
  SkeletonCards,
  ErrorBanner,
  DateRangeFilter,
  LocationFilter,
  WeekNav,
} from '../components';
import { LineChart, BarChart, StackedBarChart, DeltaBadge } from '../charts';
import { money, platformMeta, toISODate } from '../platforms';

// Turns a bucket key ('2026-08-21', '2026-W34', '2026-08') into a compact
// axis label without pulling in a date library.
function formatBucketLabel(bucket, granularity) {
  if (!bucket) return '';
  if (granularity === 'day') {
    const d = new Date(bucket + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (granularity === 'week') {
    return bucket.replace(/^\d{4}-/, '');
  }
  const [y, m] = bucket.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// A 7-day window ending `offset` weeks back from today. offset=0 is
// "this week" (last 7 days including today); offset=1 is the week before
// that, etc. This is what the per-chart Prev/Today controls page through,
// independent of whatever preset is selected in the main date filter.
function weekRangeFromOffset(offset) {
  const end = new Date();
  end.setDate(end.getDate() - offset * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export default function Analytics() {
  const [range, setRange] = useState({ days: 30 });
  const [weekOffset, setWeekOffset] = useState(0); // 0 = today; N = N weeks back
  const [centers, setCenters] = useState([]);
  const [location, setLocation] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [current, setCurrent] = useState(null); // summary or location-report for current range
  const [previous, setPrevious] = useState(null); // same shape, prior period
  const [trend, setTrend] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  // Prev/Next/Today (via WeekNav in each chart header) overrides whatever
  // is selected in the main date filter with a plain 7-day window. Picking
  // a new range/preset from the main filter drops back out of week-nav mode.
  const inWeekNav = weekOffset > 0;
  const effectiveRange = inWeekNav ? weekRangeFromOffset(weekOffset) : range;

  function handleRangeChange(r) {
    setWeekOffset(0);
    setRange(r);
  }

  useEffect(() => {
    getCenterList().then((d) => setCenters(d.centers || [])).catch(() => setCenters([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const scoped = location !== 'all';
      const prevRange = previousRange(effectiveRange);

      const fetchTotals = (r) =>
        scoped ? getLocationReport(r, location) : getSummary(r);

      const [cur, prev, tr, camp] = await Promise.all([
        fetchTotals(effectiveRange),
        prevRange ? fetchTotals(prevRange) : Promise.resolve(null),
        getTrend(effectiveRange, location),
        getCampaigns(effectiveRange, location),
      ]);

      setCurrent(cur);
      setPrevious(prev);
      setTrend(tr);
      setCampaigns((camp.campaigns || []).slice(0, 8));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveRange.days, effectiveRange.startDate, effectiveRange.endDate, effectiveRange.all, location]);

  useEffect(() => { load(); }, [load]);

  const isScoped = location !== 'all';
  const invoices = current?.totalInvoices ?? 0;
  const revenue = current?.totalRevenue ?? 0;
  const aov = current?.avgOrderValue ?? 0;
  const prevInvoices = previous?.totalInvoices ?? null;
  const prevRevenue = previous?.totalRevenue ?? null;
  const prevAov = previous?.avgOrderValue ?? null;

  const granularity = trend?.granularity || 'day';
  const revenueSeries = (trend?.series || []).map((d) => ({
    x: d.date,
    revenue: d.revenue,
    invoices: d.invoices,
    aov: d.invoices ? d.revenue / d.invoices : 0,
  }));
  const newCustomerSeries = (trend?.series || []).map((d) => ({ x: d.date, y: d.newCustomers }));

  const platformKeys = Object.keys(trend?.platformSeries || {}).filter((k) => k !== 'klaviyo');
  const platformStackData = revenueSeries.map((d) => {
    const row = { x: d.x };
    for (const key of platformKeys) {
      const match = (trend.platformSeries[key] || []).find((p) => p.date === d.x);
      row[key] = match ? match.revenue : 0;
    }
    return row;
  });
  const platformStackSeries = platformKeys.map((key) => ({ key, label: platformMeta(key).label, color: platformMeta(key).color }));

  const maxCampaignRevenue = Math.max(1, ...campaigns.map((c) => c.revenue));

  const weekNavProps = {
    weekOffset,
    onPrev: () => setWeekOffset((w) => w + 1),
    onNext: () => setWeekOffset((w) => Math.max(0, w - 1)),
    onReset: () => setWeekOffset(0),
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Wink Brow Bar</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Analytics</h1>
          <p className="mt-1 max-w-lg text-[12.5px] leading-snug text-ink/50">
            Trends over time and period-over-period comparisons — for raw numbers, see the Dashboard.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DateRangeFilter value={range} onChange={handleRangeChange} showAll />
          <LocationFilter value={location} centers={centers} onChange={setLocation} />
        </div>
      </div>

      {inWeekNav && (
        <div className="mb-5 rounded-lg border border-copper/30 bg-copper-soft px-3.5 py-2 text-[12.5px] text-ink/70" style={{ background: '#f1e2d3' }}>
          Showing <strong>{effectiveRange.startDate} → {effectiveRange.endDate}</strong> ({weekOffset} week{weekOffset === 1 ? '' : 's'} back) —
          the date filter above is paused. Hit <strong>Today</strong> on any chart to return to it.
        </div>
      )}

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      {loading ? (
        <>
          <div className="animate-shimmer mb-6 h-5 w-60 rounded-md" />
          <SkeletonCards count={4} />
        </>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink/50">Revenue</div>
              <div className="font-display text-[22px] font-semibold leading-tight text-ink">{money(revenue)}</div>
              <div className="mt-1"><DeltaBadge current={revenue} previous={prevRevenue} /></div>
            </div>
            <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink/50">Invoices</div>
              <div className="font-display text-[22px] font-semibold leading-tight text-ink">{invoices}</div>
              <div className="mt-1"><DeltaBadge current={invoices} previous={prevInvoices} /></div>
            </div>
            <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-card">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-ink/50">Avg Order Value</div>
              <div className="font-display text-[22px] font-semibold leading-tight text-ink">{money(aov)}</div>
              <div className="mt-1"><DeltaBadge current={aov} previous={prevAov} /></div>
            </div>
            <StatCard
              label="Scope"
              value={isScoped ? location : 'All Locations'}
              sub={
                inWeekNav
                  ? `${effectiveRange.startDate} → ${effectiveRange.endDate}`
                  : range.all ? 'all time' : range.startDate || range.endDate ? `${range.startDate || 'start'} → ${range.endDate || 'today'}` : `last ${range.days} days`
              }
            />
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[17px] font-medium text-ink">Revenue Trend</h2>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-ink/45">by {granularity}</span>
                <WeekNav {...weekNavProps} />
              </div>
            </div>
            <LineChart
              data={revenueSeries}
              series={[{ key: 'revenue', label: 'Revenue', color: '#b8703e' }]}
              formatValue={money}
              formatX={(v) => formatBucketLabel(v, granularity)}
            />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-[17px] font-medium text-ink">Avg Order Value Trend</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-ink/45">by {granularity}</span>
                  <WeekNav {...weekNavProps} />
                </div>
              </div>
              <LineChart
                data={revenueSeries}
                series={[{ key: 'aov', label: 'AOV', color: '#5a5fa8' }]}
                formatValue={money}
                formatX={(v) => formatBucketLabel(v, granularity)}
              />
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-[17px] font-medium text-ink">New Customers Trend</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-ink/45">by {granularity} · company-wide</span>
                  <WeekNav {...weekNavProps} />
                </div>
              </div>
              <BarChart
                data={newCustomerSeries}
                color="#6e7f63"
                formatValue={(v) => v}
                formatX={(v) => formatBucketLabel(v, granularity)}
              />
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[17px] font-medium text-ink">Platform Mix Over Time</h2>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-ink/45">{isScoped ? location : 'all locations'} · sent conversions</span>
                <WeekNav {...weekNavProps} />
              </div>
            </div>
            {platformKeys.length === 0 ? (
              <EmptyState text="No attributed conversions in this window yet." />
            ) : (
              <>
                <StackedBarChart data={platformStackData} series={platformStackSeries} formatValue={money} formatX={(v) => formatBucketLabel(v, granularity)} />
                <div className="mt-3 flex flex-wrap gap-3">
                  {platformStackSeries.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink/60">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink/40">Klaviyo excluded here (fires on every sale, not a distinct source) — see Dashboard for delivery visibility.</p>
              </>
            )}
          </div>

          <div className="mb-6 rounded-xl border border-ink/10 bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[17px] font-medium text-ink">Top Campaigns by Revenue</h2>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-ink/45">{isScoped ? location : 'all locations'}</span>
                <WeekNav {...weekNavProps} />
              </div>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState text="No campaign-attributed revenue in this window yet." />
            ) : (
              <BarChart
                data={campaigns.map((c) => ({ x: `${c._id.campaign} · ${platformMeta(c._id.platform).label}`, y: c.revenue }))}
                color="#8a5a8f"
                formatValue={money}
                formatX={(v) => (v.length > 14 ? v.slice(0, 13) + '…' : v)}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}