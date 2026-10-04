import { useState, useEffect, useCallback } from 'react';
import { getUpcomingBookings, getCenterList } from '../api';
import { EmptyState, SkeletonLines, ErrorBanner, Pagination, LocationFilter, PlatformBadge } from '../components';
import { shortDateTime, money } from '../platforms';

export default function Upcoming() {
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [centers, setCenters] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCenterList().then((d) => setCenters(d.centers || [])).catch(() => setCenters([]));
  }, []);

  useEffect(() => { setPage(1); }, [location, platform]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUpcomingBookings({ page, limit: 25, location, platform });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, location, platform]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Pipeline</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Upcoming Bookings</h1>
        </div>
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-medium text-ink">Booked, not yet visited</h2>
          {data && (
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
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
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
          </select>
        </div>

        {loading ? (
          <SkeletonLines count={5} />
        ) : !data || data.bookings.length === 0 ? (
          <EmptyState text="No upcoming bookings in the pipeline right now." />
        ) : (
          <div className="scrollbar-thin -mx-1 overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse px-1 text-[13.5px]">
              <thead>
                <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                  <th className="pb-2.5 pr-4">Invoice #</th>
                  <th className="pb-2.5 pr-4">Customer</th>
                  <th className="pb-2.5 pr-4">Service(s)</th>
                  <th className="pb-2.5 pr-4">Location</th>
                  <th className="pb-2.5 pr-4">Source / Campaign</th>
                  <th className="pb-2.5 pr-4 text-right">Est. Value</th>
                  <th className="pb-2.5 pr-4 text-right">Booked / Paid On</th>
                  <th className="pb-2.5 text-right">Appointment Date</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.appointmentId} className="border-b border-ink/10 last:border-none">
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
                    <td className="py-2.5 pr-4 text-right font-mono text-ink/70">{money(b.estimatedValue)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-ink/50">{b.bookedAt ? shortDateTime(b.bookedAt) : '—'}</td>
                    <td className="py-2.5 text-right font-mono text-ink/50">{shortDateTime(b.appointmentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}