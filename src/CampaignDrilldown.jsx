import { useState, useEffect, useCallback } from 'react';
import { getCampaignCustomers } from './api';
import { Modal, EmptyState, SkeletonLines, ErrorBanner, Pagination, SearchInput, PlatformBadge, ThWithInfo } from './components';
import { money, shortDate, platformMeta } from './platforms';

const COLUMN_INFO = {
  customer: 'The name, email, or phone on file for this customer, from their Zenoti profile.',
  sourceMedium: "The ad's UTM source / medium (e.g. facebook / cpc) captured on the visit that led to this conversion.",
  conversions: 'How many separate purchases this customer made that are attributed to this exact campaign.',
  revenue: 'Total amount this customer spent across all purchases attributed to this campaign.',
  lastConverted: 'The date of the most recent purchase attributed to this campaign for this customer. The list is sorted by this column, most recent first.',
};

export default function CampaignDrilldown({ campaign, platform, range, onClose }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCampaignCustomers({ platform, campaign, range, page, limit: 10, search: debouncedSearch });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [platform, campaign, range, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const meta = platformMeta(platform);

  return (
    <Modal
      title={campaign}
      subtitle="Customers who converted through this ad, most recent purchase first"
      onClose={onClose}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PlatformBadge platform={platform} />
        {data && <span className="text-[12.5px] text-ink/45">{data.total} customer{data.total === 1 ? '' : 's'} attributed</span>}
        <div className="ml-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, or phone…" />
        </div>
      </div>

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      {loading ? (
        <SkeletonLines count={5} />
      ) : !data || data.customers.length === 0 ? (
        <EmptyState
          text={
            debouncedSearch
              ? 'No customers match that search for this campaign.'
              : 'No customers have converted through this campaign in the selected window yet.'
          }
        />
      ) : (
        <div className="scrollbar-thin -mx-1 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse px-1 text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/10 text-left font-mono text-[10.5px] uppercase tracking-wide text-ink/45">
                <th className="pb-2.5 pr-3"><ThWithInfo label="Customer" info={COLUMN_INFO.customer} /></th>
                <th className="pb-2.5 pr-3"><ThWithInfo label="Source / Medium" info={COLUMN_INFO.sourceMedium} /></th>
                <th className="pb-2.5 pr-3 text-right"><ThWithInfo label="Conversions" info={COLUMN_INFO.conversions} align="right" /></th>
                <th className="pb-2.5 pr-3 text-right"><ThWithInfo label="Revenue" info={COLUMN_INFO.revenue} align="right" /></th>
                <th className="pb-2.5 text-right"><ThWithInfo label="Last Converted" info={COLUMN_INFO.lastConverted} align="right" /></th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c._id || c.email} className="border-b border-ink/10 last:border-none">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-ink">{c.name || '—'}</div>
                    <div className="text-[12px] text-ink/45">{c.email || c.phone || '—'}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-[12.5px] text-ink/60">
                    {[c.utmSource, c.utmMedium].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono">{c.conversions}</td>
                  <td className="py-2.5 pr-3 text-right font-mono" style={{ color: meta.color }}>{money(c.revenue)}</td>
                  <td className="py-2.5 text-right font-mono text-ink/50">{shortDate(c.lastConvertedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </div>
      )}
    </Modal>
  );
}