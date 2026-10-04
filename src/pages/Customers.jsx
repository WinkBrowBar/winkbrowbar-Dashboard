import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { getCustomers } from '../api';
import { EmptyState, SkeletonLines, ErrorBanner, SearchInput, Pagination, DateRangeFilter } from '../components';
import { money, shortDate } from '../platforms';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterByDate, setFilterByDate] = useState(false);
  const [range, setRange] = useState({ days: 30 });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  // 'recent' = most recent purchase first (the default - this is the
  // "latest order at top" view). 'revenue' = highest lifetime revenue first,
  // which used to be the only option.
  const [sortBy, setSortBy] = useState('recent');

  const hasActiveFilters = Boolean(search) || filterByDate;

  // Debounce search input so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterByDate, range, sortBy]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCustomers({
        range: filterByDate ? range : undefined,
        page,
        limit: 20,
        search: debouncedSearch,
        sortBy,
      });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, filterByDate, page, debouncedSearch, sortBy]);

  useEffect(() => { load(); }, [load]);

  const customers = data?.customers || [];

  function clearFilters() {
    setSearch('');
    setFilterByDate(false);
  }

  async function exportToExcel() {
    setExporting(true);
    try {
      // Pull every customer matching the current search/date filters, not
      // just the 20 shown on the current page, in one request.
      const res = await getCustomers({
        range: filterByDate ? range : undefined,
        page: 1,
        limit: 10000,
        search: debouncedSearch,
        sortBy,
      });
      const rows = (res.customers || []).map((c) => ({
        Name: c.name || '',
        Email: c.email || '',
        Phone: c.phone || '',
        'Lifetime Revenue': c.lifetimeRevenue || 0,
        'First Purchase': c.firstPurchaseDate ? new Date(c.firstPurchaseDate).toISOString().slice(0, 10) : '',
        'Last Purchase': c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toISOString().slice(0, 10) : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `customers-${dateStamp}.xlsx`);
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
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink/50">Audience</div>
          <h1 className="font-display text-[30px] font-medium text-ink">Customers</h1>
        </div>
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-medium text-ink">
            {sortBy === 'revenue' ? 'Ranked by lifetime revenue' : 'Most recent purchase first'}
          </h2>
          {data && (
            <span className="text-[12px] text-ink/45">
              {data.total} customer{data.total === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, or phone…" />

          <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1">
            <button
              onClick={() => setSortBy('recent')}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                sortBy === 'recent' ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('revenue')}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                sortBy === 'revenue' ? 'bg-ink text-copper' : 'text-ink/50 hover:text-ink'
              }`}
            >
              Highest revenue
            </button>
          </div>

          <button
            onClick={() => setFilterByDate((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              filterByDate ? 'border-copper bg-copper-soft text-copper' : 'border-ink/15 text-ink/50 hover:text-ink'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Last purchase date
          </button>

          {filterByDate && <DateRangeFilter value={range} onChange={setRange} />}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[12px] font-semibold text-ink/40 transition-colors hover:text-ink"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}

          <button
            onClick={exportToExcel}
            disabled={exporting || loading}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-[12px] font-semibold text-ink/70 transition-colors hover:text-ink disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>

        {loading ? (
          <SkeletonLines count={6} />
        ) : customers.length === 0 ? (
          <EmptyState text="No customers match this search yet. Once an invoice closes in Zenoti, the customer shows up here." />
        ) : (
          <>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                    <th className="pb-2.5">Name</th>
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Phone</th>
                    <th className="pb-2.5 text-right">Lifetime Revenue</th>
                    <th className="pb-2.5 text-right">First Purchase</th>
                    <th className="pb-2.5 text-right">Last Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id} className="border-b border-ink/10 last:border-none">
                      <td className="py-2.5 font-medium text-ink">{c.name || '—'}</td>
                      <td className="py-2.5 text-ink/70">{c.email || '—'}</td>
                      <td className="py-2.5 text-ink/70">{c.phone || '—'}</td>
                      <td className="py-2.5 text-right font-mono">{money(c.lifetimeRevenue)}</td>
                      <td className="py-2.5 text-right font-mono text-ink/50">{shortDate(c.firstPurchaseDate)}</td>
                      <td className="py-2.5 text-right font-mono text-ink/50">{shortDate(c.lastPurchaseDate)}</td>
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