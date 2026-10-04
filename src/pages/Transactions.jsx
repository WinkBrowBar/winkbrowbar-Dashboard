import { useState, useEffect, useCallback } from 'react';
import { getTransactions, getCenterList } from '../api';
import { EmptyState, SkeletonLines, ErrorBanner, SearchInput, Pagination, DateRangeFilter, LocationFilter, PlatformBadge } from '../components';
import { money, shortDateTime } from '../platforms';

const PLATFORM_OPTIONS = ['all', 'meta', 'google', 'awin', 'klaviyo', 'direct', 'unattributed'];

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ days: 30 });
  const [location, setLocation] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [centers, setCenters] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getCenterList().then((d) => setCenters(d.centers || [])).catch(() => setCenters([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, range, location, platform, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTransactions({ range, page, limit: 25, search: debouncedSearch, platform, location, status });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, page, debouncedSearch, platform, location, status]);

  useEffect(() => { load(); }, [load]);

  const transactions = data?.transactions || [];

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await getTransactions({ range, page: 1, limit: 10000, search: debouncedSearch, platform, location, status });
      const rows = res.transactions || [];
      const header = ['Invoice #', 'Customer', 'Email', 'Product', 'Price', 'Location', 'Platform', 'Campaign', 'Status', 'Purchase Date'];
      const csvRows = [header.join(',')];
      rows.forEach((r) => {
        const line = [
          r.invoiceNumber || '',
          r.customerName || '',
          r.email || '',
          r.productName || '',
          r.price || 0,
          r.location || '',
          r.platform || '',
          r.campaign || '',
          r.status || '',
          r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) : '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
        csvRows.push(line.join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
   <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            onClick={() => { window.location.hash = 'reports'; }}
            className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-ink/50 transition-colors hover:text-ink"
          >
            ← Back to Dashboard
          </button>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Sales</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Transactions</h1>
        </div>
        <DateRangeFilter value={range} onChange={setRange} showAll />
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-medium text-ink">Most recent first</h2>
          {data && <span className="text-[12px] text-ink/45">{data.total} transaction{data.total === 1 ? '' : 's'}</span>}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search invoice #, customer, email, product, or campaign…" />
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink/70 focus:border-copper focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="closed">Closed only</option>
            <option value="open">Open only</option>
          </select>
          <button
            onClick={exportCsv}
            disabled={exporting || loading}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-[12px] font-semibold text-ink/70 transition-colors hover:text-ink disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        {loading ? (
          <SkeletonLines count={8} />
        ) : transactions.length === 0 ? (
          <EmptyState text="No transactions match this filter yet." />
        ) : (
          <>
            <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="pb-2.5 pr-4">Invoice #</th>
                    <th className="pb-2.5 pr-4">Customer</th>
                    <th className="pb-2.5 pr-4">Email</th>
                    <th className="pb-2.5 pr-4">Product</th>
                    <th className="pb-2.5 pr-4 text-right">Price</th>
                    <th className="pb-2.5 pr-4">Location</th>
                    <th className="pb-2.5 pr-4">Ads / Campaign</th>
                    <th className="pb-2.5 pr-4">Status</th>
                    <th className="pb-2.5 text-right">Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} className="border-b border-ink/10 last:border-none">
                      <td className="py-2.5 pr-4 font-mono text-[12.5px] text-ink/70">{t.invoiceNumber || '—'}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{t.customerName || '—'}</td>
                      <td className="py-2.5 pr-4 text-ink/70">{t.email || '—'}</td>
                      <td className="py-2.5 pr-4 text-ink/70">{t.productName || '—'}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{money(t.price)}</td>
                      <td className="py-2.5 pr-4 text-ink/70">{t.location || '—'}</td>
                      <td className="py-2.5 pr-4">
                        <PlatformBadge platform={t.platform} /> <span className="text-ink/50">{t.campaign}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${t.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {t.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-ink/50">{shortDateTime(t.purchaseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
          </>
        )}
      </div>
    </>
  );
}