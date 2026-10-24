import { useState, useEffect, useCallback, useRef } from 'react';
import { getUpcomingBookings, getCenterList } from '../api';
import { EmptyState, SkeletonLines, ErrorBanner, SearchInput, Pagination, LocationFilter, PlatformBadge, DateRangeFilter, ResetFiltersButton } from '../components';
import { shortDateTime, money } from '../platforms';

export default function Upcoming() {
  const [page, setPage] = useState(1);
  // Forward-looking range - "days" means the next N days from today, not
  // the last N (see resolveUpcomingRange in dashboardRoutes.js). Default
  // matches the old hardcoded 60-day window this page always used.
  const [range, setRange] = useState({ days: 60 });
  const [location, setLocation] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [customerType, setCustomerType] = useState('all');
  const [centers, setCenters] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCenterList().then((d) => setCenters(d.centers || [])).catch(() => setCenters([]));
  }, []);

  // Same 350ms debounce as Transactions - avoids firing a request per
  // keystroke while still feeling live.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [range, location, platform, debouncedSearch, hideZero, customerType]);

  // Only the latest request may update state - see Transactions.jsx.
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const res = await getUpcomingBookings({ range, page, limit: 25, location, platform, search: debouncedSearch, hideZero, customerType });
      if (id === reqId.current) setData(res);
    } catch (err) {
      if (id === reqId.current) setError(err.message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [range, page, location, platform, debouncedSearch, hideZero, customerType]);

  useEffect(() => { load(); }, [load]);

  const hasActiveFilters = Boolean(search) || location !== 'all' || platform !== 'all' || hideZero || customerType !== 'all' || Number(range.days) !== 60;

  function resetFilters() {
    setSearch('');
    setRange({ days: 60 });
    setLocation('all');
    setPlatform('all');
    setHideZero(false);
    setCustomerType('all');
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Pipeline</div>
          <h1 className="font-display text-[30px] font-bold tracking-tight text-ink">Upcoming Bookings</h1>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-medium text-ink">Booked, not yet visited</h2>
          {data && !loading && (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-ink/45">{data.total} booking{data.total === 1 ? '' : 's'}</span>
              <span className="rounded-full bg-copper/10 px-3 py-1 text-[12px] font-semibold text-copper">
                Est. {money(data.totalEstimatedValue)} upcoming
              </span>
            </div>
          )}
        </div>
        <p className="mb-4 text-[12.5px] text-ink/50">
          Not counted in any revenue total. Source is the exact UTM from the booking link, not a guess.
          Est. Value is the average price charged for that service over the last 6 months - an estimate, not a confirmed amount.
          Cancelled bookings are shown for visibility but excluded from the total above.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search invoice #, customer, email, service, or campaign…" />
          <LocationFilter value={location} centers={centers} onChange={setLocation} />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink/70 focus:border-copper focus:outline-none"
          >
            <option value="all">All Platforms</option>
            {(data?.availablePlatforms || []).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            {/* keep the selected platform's option present even if it has no
                data in the current date range - see Transactions.jsx for why */}
            {platform !== 'all' && !(data?.availablePlatforms || []).includes(platform) && (
              <option value={platform}>{platform}</option>
            )}
          </select>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink/70 focus:border-copper focus:outline-none"
          >
            <option value="all">New &amp; Returning</option>
            <option value="new">New only</option>
            <option value="returning">Returning only</option>
          </select>
          <button
            onClick={() => setHideZero((v) => !v)}
            className={`rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              hideZero ? 'border-copper bg-copper/10 text-copper' : 'border-ink/15 bg-white text-ink/70'
            }`}
          >
            {hideZero ? 'Hiding $0 items' : 'Hide $0 items'}
          </button>
          {hasActiveFilters && <ResetFiltersButton onClick={resetFilters} />}
        </div>

        {loading ? (
          <SkeletonLines count={5} />
        ) : !data || data.bookings.length === 0 ? (
          <EmptyState text="No upcoming bookings in the pipeline right now." />
        ) : (
          <div className="scrollbar-thin -mx-1 overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse px-1 text-[13.5px]">
              <thead>
                <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                  <th className="pb-2.5 pr-4">Invoice #</th>
                  <th className="pb-2.5 pr-4">Customer</th>
                  <th className="pb-2.5 pr-4">Service(s)</th>
                  <th className="pb-2.5 pr-4">Location</th>
                  <th className="pb-2.5 pr-4">Source / Campaign</th>
                  <th className="pb-2.5 pr-4 text-right">Est. Value</th>
                  <th className="pb-2.5 pr-4 text-right">Customer</th>
                  <th className="pb-2.5 pr-4 text-right">Status</th>
                  <th className="pb-2.5 pr-4 text-right">Booked / Paid On</th>
                  <th className="pb-2.5 text-right">Appointment Date</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => {
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <tr key={b.appointmentId} className={`border-b border-ink/10 last:border-none${isCancelled ? ' opacity-50' : ''}`}>
                      <td className="py-2.5 pr-4 font-mono text-[12.5px] text-ink/70">{b.invoiceNumber || '—'}</td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-ink">{b.customerName || '—'}</div>
                        <div className="text-[12px] text-ink/45">{b.email || '—'}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-ink/80">{(b.services || []).join(', ') || '—'}</td>
                      <td className="py-2.5 pr-4 text-ink/60">{b.location || '—'}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={b.utmSource || 'direct'} />
                          <span className="text-ink/50">{b.utmCampaign || '(no campaign)'}</span>
                        </div>
                      </td>
                      <td className={`py-2.5 pr-4 text-right font-mono ${isCancelled ? 'text-ink/40 line-through' : 'text-ink/70'}`}>{money(b.estimatedValue)}</td>
                      <td className="py-2.5 pr-4 text-right">
                        {b.customerType === 'new' ? (
                          <span className="rounded-full bg-copper/10 px-2.5 py-0.5 text-[11px] font-semibold text-copper">New</span>
                        ) : b.customerType === 'returning' ? (
                          <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-semibold text-ink/60">Returning</span>
                        ) : (
                          <span className="text-[11px] text-ink/35">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11.5px] font-semibold text-red-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Upcoming
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-ink/50">{b.bookedAt ? shortDateTime(b.bookedAt) : '—'}</td>
                      <td className="py-2.5 text-right font-mono text-ink/50">{shortDateTime(b.appointmentDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}